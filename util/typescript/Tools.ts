
// some usefull shorthand methods

class Optional<T>
{
    constructor(private isPresent: boolean, private value?: T) {}

    static of<T>(value: T): Optional<T>
    {
        return new Optional(true, value);
    }

    static no<T>(): Optional<T>
    {
        return new Optional(false, null);
    }

    get = () => this.value;
    has = () => this.isPresent;
}
