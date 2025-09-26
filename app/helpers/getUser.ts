export function getUser() {
    const userCookie = useCookie<string | null>('u', {
        decode: (v: string) => v
    });
    
    if (!userCookie.value) return null;
    
    try {
        // Добавляем проверку на наличие Buffer (для клиентской стороны)
        const decodeBase64 = (str: string): string => {
            if (typeof window !== 'undefined') {
                // Браузерное окружение
                return atob(str);
            } else {
                // Node.js окружение
                return Buffer.from(str, 'base64').toString('utf8');
            }
        };

        const decodedUser = decodeBase64(userCookie.value);
        return JSON.parse(decodedUser) as {
            confirmed: boolean;
            roleCode: string | null;
            id: number;
            token: string;
        };
    } catch (error) {
        console.error('Error parsing user cookie:', error);
        return null;
    }
}