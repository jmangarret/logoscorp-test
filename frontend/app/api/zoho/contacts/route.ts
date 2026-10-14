import { NextResponse } from "next/server";
import { ZohoContact } from "./interface";
import { User } from "@/app/users/interface";


type ZohoInsertResponse = {
  data?: Array<{
    code?: string;
    message?: string;
    details?: { id?: string };
    status?: string;
    action?: string;
  }>;
};

function validUser(value: unknown): value is User {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<User>;
  return (
    Number.isInteger(user.id) &&
    typeof user.name === "string" && user.name.trim().length > 0 &&
    typeof user.email === "string" && user.email.includes("@") &&
    typeof user.phone === "string" &&
    Boolean(user.company && typeof user.company.name === "string") &&
    Boolean(user.address && typeof user.address.street === "string" && typeof user.address.city === "string" && typeof user.address.zipcode === "string")
  );
}

function toZohoContact(user: User): ZohoContact {
  const nameParts = user.name.trim().split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts.pop()! : nameParts[0];
  return {
    First_Name: nameParts.length === 0 ? "" : nameParts.join(" "),
    Last_Name: lastName,
    Email: user.email,
    Phone: user.phone,
    Company: user.company.name,
    Mailing_Zip: user.address.zipcode,
    Mailing_Street: user.address.street,
    Mailing_City: user.address.city,
  };
}

export async function POST(request: Request) {
  const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN } = process.env;
  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    return NextResponse.json(
      { error: "Configura ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET y ZOHO_REFRESH_TOKEN en el entorno del servidor." },
      { status: 503 },
    );
  }

  let body: { users?: unknown } | null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 });
  }

  const users = body?.users;
  if (!Array.isArray(users) || users.length === 0 || users.length > 10 || !users.every(validUser)) {
    return NextResponse.json({ error: "Selecciona entre 1 y 10 usuarios válidos." }, { status: 400 });
  }

  const accountsUrl = (process.env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.com").replace(/\/$/, "");
  const apiDomain = (process.env.ZOHO_API_DOMAIN || "https://www.zohoapis.com").replace(/\/$/, "");

  try {
    const tokenUrl = new URL(`${accountsUrl}/oauth/v2/token`);
    tokenUrl.search = new URLSearchParams({
      refresh_token: ZOHO_REFRESH_TOKEN,
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      grant_type: "refresh_token",
    }).toString();

    const tokenResponse = await fetch(tokenUrl, { method: "POST", cache: "no-store" });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || typeof token.access_token !== "string") {
      console.error("Zoho OAuth token request failed", token.error || tokenResponse.status);
      return NextResponse.json({ error: "Zoho no pudo autorizar la conexión. Revisa la configuración OAuth." }, { status: 502 });
    }

    const records: ZohoContact[] = (users as User[]).map(toZohoContact);

    const crmUrl = `${apiDomain}/Contacts`;
    const crmRequestBody = { data: records, trigger: [] };
    const crmResponse = await fetch(crmUrl, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(crmRequestBody),
    });
    const responseText = await crmResponse.text();
    let result: ZohoInsertResponse;
    try {
      result = JSON.parse(responseText) as ZohoInsertResponse;
      console.log(JSON.stringify(result.data))
      console.log({total: result.data?.length})
    } catch {
      result = {};
    }
    if (!crmResponse.ok || !Array.isArray(result.data)) {
      console.error("Zoho CRM insert failed", {
        request: { method: "POST", url: crmUrl, body: crmRequestBody },
        response: { status: crmResponse.status, statusText: crmResponse.statusText, body: JSON.stringify(result.data) ?? responseText },
      });
      return NextResponse.json({ error: "Zoho CRM no pudo procesar los usuarios seleccionados." }, { status: 502 });
    }

    const outcomes = result.data.map((item, index) => ({
      id: (users as User[])[index].id,
      success: item.status === "success",
      message: item.status === "success" ? "Enviado a Zoho CRM" : item.message || item.code || "No se pudo crear el contacto",
    }));

    const failedOutcomes = outcomes.filter((outcome) => !outcome.success);
    if (failedOutcomes.length > 0) {
      console.error("Zoho CRM rejected contact records", {
        request: {
          method: "POST",
          url: crmUrl,
          body: {
            data: failedOutcomes.map((outcome) => ({
              userId: outcome.id,
              record: records[(users as User[]).findIndex((user) => user.id === outcome.id)],
            })),
            trigger: [],
          },
        },
        response: result.data.filter((item) => item.status !== "success"),
      });
    }

    return NextResponse.json({
      total: outcomes.length,
      sent: outcomes.filter((outcome) => outcome.success).length,
      failed: outcomes.filter((outcome) => !outcome.success).length,
      outcomes,
    });
  } catch (error) {
    console.error("Zoho CRM request failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "No se pudo completar la conexión con Zoho CRM." }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  let body: { originalEmail?: unknown; user?: unknown } | null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 });
  }

  if (typeof body?.originalEmail !== "string" || !validUser(body.user)) {
    return NextResponse.json({ error: "Los datos del usuario no son válidos." }, { status: 400 });
  }

  const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN } = process.env;
  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    return NextResponse.json(
      { error: "Configura ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET y ZOHO_REFRESH_TOKEN en el entorno del servidor." },
      { status: 503 },
    );
  }

  const accountsUrl = (process.env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.com").replace(/\/$/, "");
  const apiDomain = (process.env.ZOHO_API_DOMAIN || "https://www.zohoapis.com").replace(/\/$/, "");
  try {
    const tokenUrl = new URL(`${accountsUrl}/oauth/v2/token`);
    tokenUrl.search = new URLSearchParams({
      refresh_token: ZOHO_REFRESH_TOKEN,
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      grant_type: "refresh_token",
    }).toString();
    const tokenResponse = await fetch(tokenUrl, { method: "POST", cache: "no-store" });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || typeof token.access_token !== "string") {
      console.error("Zoho OAuth token request failed", token.error || tokenResponse.status);
      return NextResponse.json({ error: "Zoho no pudo autorizar la conexión. Revisa la configuración OAuth." }, { status: 502 });
    }

    const headers = {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    };
    const searchUrl = new URL(`${apiDomain}/crm/v8/Contacts/search`);
    searchUrl.searchParams.set("email", body.originalEmail);
    const searchResponse = await fetch(searchUrl, { headers, cache: "no-store" });
    let existingId: string | undefined;
    if (searchResponse.ok) {
      const searchResult = (await searchResponse.json()) as { data?: Array<{ id?: string }> };
      existingId = searchResult.data?.[0]?.id;
    } else if (searchResponse.status !== 204) {
      console.error("Zoho contact lookup failed", searchResponse.status);
      return NextResponse.json({ error: "No se pudo localizar el contacto en Zoho CRM." }, { status: 502 });
    }

    const isExisting = Boolean(existingId);
    const saveResponse = await fetch(
      isExisting ? `${apiDomain}/crm/v8/Contacts` : `${apiDomain}/crm/v8/Contacts/upsert`,
      {
        method: isExisting ? "PUT" : "POST",
        cache: "no-store",
        headers,
        body: JSON.stringify({
          data: [{ ...(isExisting ? { id: existingId } : {}), ...toZohoContact(body.user) }],
          ...(!isExisting ? { duplicate_check_fields: ["Email"] } : {}),
          trigger: [],
        }),
      },
    );
    const saveResult = (await saveResponse.json()) as ZohoInsertResponse;
    const result = saveResult.data?.[0];
    if (!saveResponse.ok || result?.status !== "success") {
      console.error("Zoho contact save failed", saveResponse.status, result?.code);
      return NextResponse.json(
        { error: result?.message || "Zoho CRM no pudo guardar los cambios." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      action: isExisting || result.action === "update" ? "updated" : "created",
      zohoId: result.details?.id || existingId,
    });
  } catch (error) {
    console.error("Zoho contact save failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "No se pudo guardar el usuario en Zoho CRM." }, { status: 502 });
  }
}
