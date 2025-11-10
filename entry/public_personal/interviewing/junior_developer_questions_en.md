# SysAdmin with transition to developer questions
                                   author: Artur Klesun

## Abstract

This document is to be used as a reference for the interviewing SysAdmin + Junior Developer position candidates to measure their knowledge/competence.

It should be made clear to the applicant that they are not expected to answer all of the questions, they should just try to answer as many questions they know answer to as possible, but it's ok if they don't have an answer for any of them.

## Junior Developer questions

- What is the difference between Integer and Floating Point data types in most programming languages? Can you tell me how Floating Point values are stored?
  - Integer for whole numbers, floating point for non-whole numbers. Floating point numbers are stored as a binary sequence of digits (up to 15) and their base of 10
- Can you tell me what Modulus arithmetic operator does? (more of a academic termin knowledge question rather than a programming question)
- How many bits are there in a byte?
  - 8
- What will be the decimal representation of the binary 101 number
  - 5
- What is a recursive function?
  - A function that calls itself essentially breaking the problem into simpler sub-problems.
- Could you explain what are: linear complexity, constant complexity and exponential complexity?
  - Linear: the number of operations is the same as the number of elements O(N).
  - Constant: the number of operations is fixed regardless of the number of elements O(1).
  - Exponential: the number of operations grows exponentially with the number of elements 2^O(N).
- What does it mean when object is immutable?
  - Its fields cannot change.
- What is JSON?
  - A minimalistic data structure format consisting of primitives, arrays and objects. Replaced XML as the most popular format for transferring data via HTTP APIs.
- What does “break” do inside a loop? And "continue"?
  - Answer: Exits the loop immediately.
- What is the difference between text encoding UTF-8 and ASCII?
  - Answer: ASCII uses 7 bits and represents 128 characters; UTF-8 uses 1–4 bytes and can represent all Unicode characters.


- (if background is not javascript) What are threads?
  - Processes running in parallel by utilizing multiple CPU cores (or emulation on a single core). Before async was popularized in programming languages, threads were the most common way of handling blocking operations like I/O reads.

## If has C++ background
- What is a destructor method
  - Function that is called when instance is destroyed. Intended to release the memory which was dynamically allocated by the class instance.
- What is the difference between declaring a class variable locally and and the new operator?
  - Declaring locally will store in in stack, new operator will store it in heap and will need deallocation.
- What is the difference between heap and stack.
  - 
- Why is it required to always call delete on all objects created with new?
  - Because otherwise they will stay in the heap as a memory leak since C++ does not have garbage collectors.


## If has C background
- What does malloc command do?
  - Allocates memory on heap. Has to be released later.
- What will happen if in an array of size 10 characters you will try to assign into 11-th index?
  - It will write it into an unallocated memory that is likely used by other variables.
- What is the difference between a struct and a class?
  - Class is a C++ specific feature that in addition to fields also has methods, inheritance, destructors, etc...


## If has C# background
- What is the data structure for storing key-value pairs (hash-map) called in C#?
  - Dictionary.
- What is the difference between an array and a list.
  - Array has fixed length, list has dynamic length.


## General programming questions (13 questions)

- Which of the following is better and why: exponential complexity O(2^N), constant complexity O(1), linear complexity O(N), quadratic complexity O(N^2), logarithmic complexity O(log(N))
  - constant > logarithmic > linear > quadratic > exponential. The complexity says how execution time of the program depends on the number of elements in the input. Constant and logarithmic are super fast, exponential is awfully slow.

## If has Linux background

- What is sudo
  - Executes next command as administrator

- What is chmod 777 command in Linux
  - chmod changes what kind of users can read/write/execute the file. 777 is usually a very bad idea since it gives full access to the file to guest users who may, for example, have connected via samba

- What is ssh
  - A command that lets you remotely connect to a linux server to execute terminal commands.

- What is the GNU General Public License
  - It is the license that allows you to use the licensed software under the condition that you will make your own software open source.
- What programming language is Linux kernel written on?
  - C
- What command do you use in terminal to list files in current directory?
  - ls
- What command do you use to go into a directory?
  - cd


## Backend questions

- What are transactions?
  - Rollback
~ You need to execute two SQL write operations together (say, insert a `comment` record and update the `last_commented_on` column in `person` table). How can you guarantee that if one of the operations fails (say, due to a database restart between the two calls), that the changes made by the other operation will not persist either, i.e. that there will be no inconsistent state in database caused by partial update.
  - By wrapping the operations in a transaction: https://en.wikipedia.org/wiki/Database_transaction
- What are keys/indexes neded for
  - To speed up queries filtering by indexed columns. Without indexes filtering will work by linear search of the whole table.
- What is Foreign Key
  - A constraint that forces a column representing an ID in another table to be consistent, i.e. to guarantee that it exists in the said table 
- What is LEFT JOIN
  - Join that does not remove base table rows if there are no matches in the joined table 
- How can you create a dead lock
  - With transactions: with pessimistic lock, transaction A lock a row in table X, then a row in table Y; transaction B locks a row in table Y, then in table X
  - Without transactions: lock a table and forget to unlock it

## git

- What does git stash command do?
  - Hides local changes in a "stash"
- When you clone a git project, does it also copy all history to your pc, or is it just the latest commit?
  - It copies all history.
- What is the difference between cloning repository via ssh and via https?
  - They are two different protocols. SSH uses private/public key pair to authenticate you, while https often either does not assume any authentication at all or uses conventional username/password authentication.

## CSS questions (6 questions)

- If you want to apply different styles when same page is opened on mobile and desktop, what would you normally use?
  - `@media screen max-width` block 

- How to make image fill/fit the container:
  - In `<img>`: object-fit:..., in background: background-size:... 

## Typescript questions (5 questions)

- What is the difference between any and unknown?
  - Any is a non-type-safe hack, whereas unknown is type safe.

- What are the advantages of strict=true parameter in tsconfig?
  - Without strict=true you lose a lot of type safety: implicit any in functions does not get reported and null checks are not enforced.

- Do types exist at runtime.
  - No. This is one of the official non-goals of the typescript.

## React questions

- What is state (`useState()`) and what is props?
  - Props are immutable parameters coming from parent component, state are internal mutable variables.

- If you have a computation-heavy function used in the rendering, how to make it reuse cached result between re-renderings instead of getting called again and again? Assuming that this function is expressed through props.
  - `useMemo()`. If answered "`useEffect()`", ask for a stateless alternative.

- What is the second parameter of the `useEffect()`? The array that follows the callback parameter.
  - List of values that trigger that callback every time any of them is changed.

- What is the purpose of `key` attribute?
  - It binds the state of the component to a specific string value: when that value changes between two renders, component is re-created resetting it's internal state.

- If you have an array variable in the state, and you want to add a value to that array, how would you do that and why?
  - `setArr([...arr, newValue])`. `arr.push()` does not trigger re-render in React: object reference has to be changed. 

- What is the difference between React's `onChange=...` attribute and vanilla html's `onchange="..."` attribute?
  - React's `onChange=...` gets triggered on every character input, whereas html's `onchange="..."` is essentially only triggered on blur  

Ожидаемые ответы предоставлены чтоб помочь собеседователю понять суть вопроса, однако ответ собеседуемого вполне может оказаться более полным/точным, не списывайте такой случай как ошибку ;)








