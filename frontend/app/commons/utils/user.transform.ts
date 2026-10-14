import { Company, User } from "@/app/users/interface";

/**
 * Transform the user data from the API to the user data for the frontend.
 * @param userData - The user data from the API.
 * @returns The user data for the frontend.
 */
export const transformUserData = (userData: User[]): User[] => {
    const transformedUserData: User[] = userData.map((user: User) => {
        return transformOneUserData(user);
    });

    return transformedUserData;
};

/** transfor one user data from the API to the user data for the frontend.   */
export const transformOneUserData = (userData: User): User => {
    const user = {
        id: userData.id,
        name: userData.name,
        username: userData.username,
        email: userData.email,
        address: userData.address,
        phone: transformUserPhone(userData.phone),
        website: transformUserWebsite(userData.website),
        company: userData.company,
    };
    console.log(user);
    console.log(validateUserCompany(user.company));
    return user;
};
/**
 * Transform the user data from the API to the user data for the frontend.
 * only keep the numbers and remove the + and spaces.
 * @param phone - The phone from the user.
 * @returns The phone only numbers without the + and spaces.
 */
export const transformUserPhone = (phone: string) => {
    if (!phone) return "";
    return phone.replace(/[^0-9]/g, '');
};

/**
 * Transform the user data from the API to the user data for the frontend.
 * If the url does not start with http:// or https://, add it.
 * @param website - The website from the user.
 * @returns The url with the http:// or https://.
 */
export const transformUserWebsite = (website: string) => {
    if (!website) return "";
    return website.startsWith('http://') || website.startsWith('https://') ? website : `https://${website}`;
};

/**
 * Transform the user data from the API to the user data for the frontend.
 * Valid contains "Group", "Inc." or "LLC" at the end of the name.
 * If the company name does not contain "Group", "Inc." or "LLC" at the end of the name, return false.
 * @param company - The company from the user.
 * @returns True if the company name contains "Group", "Inc." or "LLC" at the end of the name, false otherwise.
 */
export const validateUserCompany = (company: Company) => {
    return company.name.endsWith('Group') || company.name.endsWith('Inc.') || company.name.endsWith('LLC');
};