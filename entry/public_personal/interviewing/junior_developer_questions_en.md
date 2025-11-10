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

Ожидаемые ответы предоставлены чтоб помочь собеседователю понять суть вопроса, однако ответ собеседуемого вполне может оказаться более полным/точным, не списывайте такой случай как ошибку ;)








