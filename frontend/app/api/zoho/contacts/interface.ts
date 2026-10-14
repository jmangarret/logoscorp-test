/** 
 * Interface for the Zoho Contacts API.
 * {
            "Company": "ABC",
            "Last_Name": "Daly",
            "First_Name": "Paul 3",
            "Email": "p.daly3@zylker.com",
            "Mailing_Zip":"",
            "Mailing_Street": "",
            "Mailing_City":"",
            "Phone": ""   
        }
 */
export interface ZohoContact {
    Company: string;
    Last_Name: string;
    First_Name: string;
    Email: string;
    Mailing_Zip: string;
    Mailing_Street: string;
    Mailing_City: string;
    Phone: string;
}