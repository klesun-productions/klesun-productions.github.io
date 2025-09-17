# SysAdmin with transition to developer questions
                                   author: Artur Klesun

## Abstract

This document is to be used as a reference for the interviewing SysAdmin + Junior Developer position candidates to measure their knowledge/competence.

It should be made clear to the applicant that they are not expected to answer all of the questions, they should just try to answer as many questions they know answer to as possible, but it's ok if they don't have an answer for any of them.



## SysAdmin questions
- What is the difference between 32-bit and 64-bit systems?
  - 32-bit limit is 4 GiB of RAM

- What is fragmentation/defragmentation?
  - when part of file is in one end of hard drive and another on another end

- Could you tell me what you know about NTFS, FAT32 and ext4 file systems?
  - NTFS is a proprietary file system used by windows. FAT32 is mostly used by SD cards, has a limit of 4 GiB per file. Ext4 is a linux file system with logging that uses some smart algorithm for distribution of data that prevents fragmentation.

- What is BitLocker
  - Disk encryption

- What does ping terminal command do?
  - It checks whether there is a live server listening for connections on the specified IP address.

- What is bad blocks
  - Parts of the hard drive that are physically corrupted. An indication that device should be replaced.

- What are advantages and disadvantages of 5 GHz wifi vs 2.4 GHz wifi?
  - 5 Ghz has higher throughput, but lower range

- What is the difference between http and https?
  - https uses ssl certificates to encrypt and sign requests and responses therefore protecting the contents of communication between server and client from ISPs

- Can you describe the principle of public/private key encryption?
  - When you want to securely send some data, you encrypt it with recipient's public key and then only that specific recipient can decrypt it using his private key. Likewise, recipient can encrypt some data with his private key and then anyone will be able to descrypt it with his public key proving that data was indeed sent by that recipient.

- What is the difference between TCP and UDP protocols?
  - TCP waits for confirmation of delivered data, UDP does not.

- What is sha256
  - A hashing algorithm

- What http status codes do you know by heart?
  - 400 Bad Request, 401 Unauthorized, 403 Forbidden, 200 Success, 300 Redirect, 404 Not Found, 422 Unprocessable Entity, 500 Internal Server Error, 501 Not Implemented, 502 Bad Gateway



## Junior Developer questions

- What is the difference between Integer and Floating Point data types in most programming languages? Can you tell me how Floating Point values are stored?
  - Integer for whole numbers, floating point for non-whole numbers. Floating point numbers are stored as a binary sequence of digits (up to 15) and their base of 10
- How many bits are there in a byte?
  - 8
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

- What is the difference between data structures: Set and List?
  - Set does not store duplicate values and provides methods to check for presence of an element in constant time

- What is the difference between data structures: Queue and Stack?
  - Queue: first-in-first-out, Stack: last-in-first-out

- What is Binary Search?
  - ожидаемый ответ: "Из отсортированного массива берётся эелемент по середине и сравнивается с искомым значением: если элемент больше искомого, исключаем из поиска половину массива начиная со среднего элемента, иначе исключаем половину до середины. Из оставшейся половины снова берём элемент по середине и снова отсекаем половину, продолжаем до тех пор пока в ходе половинивания не останется 1 элемент - это и будет искомое значение. Логаритмическое время."

- What is Garbage Collector?
  - A mechanism that releases memory that was reserved for variables that are not referenced by the code anymore. It's contrary to manual memory allocation used in C and Rust where programmer has to allocate and release memory explicitly for every dynamic data structure like list. The advantage of garbage collection is simplicity of code and safety from memory leaks, the disadvantage is performance and stop-the-world events.

- Could you describe how memory is allocated in ArrayList data structure when you insert a new value?
  - A fixed size array with heuristic initial length is created underneath. When the length is reached, a new array is created with new length multiplied by a heuristic factor, like two, all values are then copied from old array to new array.

- What is Hash Map (aka Map, aka Dictionary, aka Associative Array)
  - ожидаемый ответ: "мап предназначен для хранения и быстрого доступа к элементу по ключу (ключ как правило строка) за константное время"

- Which of the following is better and why: exponential complexity O(2^N), constant compexity O(1), linear complexity O(N), quadratic complexity O(N^2), logarithmic complexity O(log(N))
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

- You need to execute two SQL write operations together (say, insert a `comment` record and update the `last_commented_on` column in `person` table). How can you guarantee that if one of the operations fails (say, due to a database restart between the two calls), that the changes made by the other operation will not persist either, i.e. that there will be no inconsistent state in database caused by partial update.
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
  
  
  
## Javascrpt questions (14 questions)

- What is the difference between POST and GET HTTP methods?
  - Expected answer: GET requests normally don't include the payload body and are cacheable on CDNs

- What is CORS?

- What is innerHTML property in DOM elements? Would you use innerHTML to insert a text content in an html element and how?
  - Expected answer: either "I would rather use textContent" or "I would escape html entities first" because injection

- What is race condition?
  - Poorly designed behaviour of the application that relies on the certain order of multiple async calls without means taken to guarantee the execution order.  

- How would you call http requests to make them run in parallel without blocking each other?
  - Expected answer: using Promise.all() or calling first await after last request was started.

- What is regular expressions?
  - A language used to describe the pattern of a string to ensure that it matches a specific format and to extract particular parts of the string.

- When you create a Date object by passing it a datetime string without timezone offset, in which timezone will it be interpreted?
  - Local time from windows settingss

- In javascript, what will be the result of 0.1 + 0.2? Not 0.3. Why?
  - 0.30000000000000004

- How many threads does javascript code normally use?
  - 1. Javascript handles concurrency with async callback and event loop rather than threads.

- What software do you normally use to compile javascript code into an executable program?
  - Trap question. Javascript is an interpreted language, not compiled. Possible accepted alternate answers, though: webpack/bundler/vite/typescript/v8/browser/node/etc...

- What is the difference in the behaviour of `this.` in arrow functions and traditional non-arrow functions
  - In traditional non-arrow functions `this` references the object whose member called function is, in arrow functions this references same as this of the scope where this function is created.

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




