export function isPrime(value: number): boolean {
    if (value <= 2) {
        return false;
    }

    for (let i = 2; i < value; i++) {
        if (value % i === 0) {
            return false;
        }
    }

    return true;
}
