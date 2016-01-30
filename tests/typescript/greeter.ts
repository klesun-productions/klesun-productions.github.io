var dirtyWords = ['slut', 'bitch', 'gigolo', 'asshole', 'php programmer'];

interface IPerson {
    firstName: string;
    lastName: string;
    knownLanguages: Array<string>;
    getFullName: { (): string };
}

class Person {
    knownLanguages: Array<string> = [];
    constructor(
        public firstName: string,
        public lastName: string
    ) {}
    getFullName = () => this.firstName + ' D. ' + this.lastName;
    //learn: { (lang: string) } = this.knownLanguages.push;
    learn = lang => this.knownLanguages.push(lang);
}

var greeter = function(person: IPerson, zhopa = 'pizda')
{
    var dirtify = (word: string) => 'dirty ' + word;
    
    var index = Math.floor(Math.random() * dirtyWords.length);

    return 'Hello, ' + person.getFullName() + '. You are: ' + ' ' + dirtify(dirtyWords[index] + " voob6e" + zhopa) + '<br/>' +
        'Listen, everybody, ' + person.firstName + ' knows: ' + person.knownLanguages.join('; ') + '!'
        ;
};

// var user = 'Janis Stukmanis';
var sasha = new Person('Sasha', 'Pikachuk');
sasha.learn('Rust');
sasha.learn('C#');
sasha.learn('(with disgust) C++');
sasha.learn('PHP');
sasha.learn('Javascript');
sasha.learn('HTML');
sasha.learn('CSS');

document.body.innerHTML = greeter(sasha);