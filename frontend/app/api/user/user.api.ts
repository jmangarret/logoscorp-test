const apiurl = "https://jsonplaceholder.typicode.com";

export const getUsers = async () => {
    try {
        const response = await fetch(`${apiurl}/users`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};