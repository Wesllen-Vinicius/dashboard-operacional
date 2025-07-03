/**
 * Remove todos os caracteres não numéricos de uma string.
 * @param value A string a ser limpa.
 * @returns A string contendo apenas números ou uma string vazia.
 */
const cleanDocument = (value: string | null | undefined): string => {
    if (!value) return '';
    return value.replace(/[^\d]/g, '');
};

/**
 * Verifica se um número de CNPJ é válido.
 * @param cnpj O CNPJ a ser validado (pode conter máscara).
 * @returns `true` se o CNPJ for válido, `false` caso contrário.
 */
export const isValidCnpj = (cnpj: string | null | undefined): boolean => {
    const numbersOnly = cleanDocument(cnpj);

    if (numbersOnly.length !== 14 || /^(\d)\1+$/.test(numbersOnly)) {
        return false;
    }

    let length = numbersOnly.length - 2;
    let numbers = numbersOnly.substring(0, length);
    const digits = numbersOnly.substring(length);
    let sum = 0;
    let pos = length - 7;

    for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i), 10) * pos--;
        if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0), 10)) {
        return false;
    }

    length += 1;
    numbers = numbersOnly.substring(0, length);
    sum = 0;
    pos = length - 7;

    for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i), 10) * pos--;
        if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1), 10)) {
        return false;
    }

    return true;
};

/**
 * Verifica se um número de CPF é válido.
 * @param cpf O CPF a ser validado (pode conter máscara).
 * @returns `true` se o CPF for válido, `false` caso contrário.
 */
export const isValidCpf = (cpf: string | null | undefined): boolean => {
    const numbersOnly = cleanDocument(cpf);

    if (numbersOnly.length !== 11 || /^(\d)\1+$/.test(numbersOnly)) {
        return false;
    }

    let sum = 0;
    let remainder: number;

    for (let i = 1; i <= 9; i++) {
        sum += parseInt(numbersOnly.substring(i - 1, i), 10) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(numbersOnly.substring(9, 10), 10)) {
        return false;
    }

    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum += parseInt(numbersOnly.substring(i - 1, i), 10) * (12 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(numbersOnly.substring(10, 11), 10)) {
        return false;
    }

    return true;
};
