import type { Driver } from "../Driver/types";
import type { Employee } from "../Employee/types";

export interface User {
    atiId: number;
    chatId: number;
    confirmToken: string;
    confirmed: boolean;
    confirmedNotification: boolean;
    driver: Driver;
    employee: Employee;
    errorConfirm: boolean;
    fullName: string;
    id: number;
    login: string;
    name: string;
    password: string;
    phone: string;
    role: {};
}