export async function checkKPP(kpp: string): Promise<any> {
    const url = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party";
    const token = "2ce16bc80ef9e058e5291bd99fd419126490eb0d";

    try {
        const result = await $fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": "Token " + token
            },
            body: { query: kpp } 
        });
        return result;
    } catch (error) {
        throw error;
    }
}