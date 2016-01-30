
/* @flow */

// copypasted from the typescript version

var dirtyWords = ['slut', 'bitch', 'gigolo', 'asshole', 'php programmer'];

type IPerson = {
    firstName: string,
    lastName: string,
    knownLanguages: Array<string>,
    getFullName: { (): string },
    learn: { (lang: string): number }
}

var Person = function(firstName: string, lastName: string): IPerson
{
    var knownLanguages: Array<string> = [];

    // ide says, it does not match IPerson, but i don't care anymore
    // i choose typescript
    return {
        firstName: firstName,
        lastName: lastName,
        knownLanguages: knownLanguages,
        getFullName: () => firstName + ' D. ' + lastName,
        learn: (lang: string) => knownLanguages.push(lang)
    };
};

var greeter = function(person: IPerson)
{
    var dirtify = (word: string) => 'dirty ' + word;

    var index = Math.floor(Math.random() * dirtyWords.length);

    return 'Hello, ' + person.getFullName() + '. You are: ' + ' ' + dirtify(dirtyWords[index]) + '<br/>' +
        'Listen, everybody, ' + person.firstName + ' knows: ' + person.knownLanguages.join('; ') + '!'
        ;
};

// var user = 'Janis Stukmanis';
var sasha = Person('Sasha', 'Pikachuk');
sasha.learn('Rust');
sasha.learn('C#');
sasha.learn('(with disgust) C++');
sasha.learn('PHP');
sasha.learn('Javascript');
sasha.learn('HTML');
sasha.learn('CSS');

document.body.innerHTML = greeter(sasha);
