# Senior Full Stack Developer questions
                                   author: Artur Klesun

## Abstract

This document is to be used as a reference for the interviewing Full Stack Developer position candidates to measure their knowledge/competence.

It should be made clear to the applicant that they are not expected to answer all of the questions, they should just try to answer as many questions they know answer to as possible, but it's ok if they don't have an answer for any of them.

## Introduction

- Can you tell us a bit about yourself?

## Javascrpt questions (14 questions)

- What is WebSockets?
  - Expected answer: a protocol used in browsers that allows sending messages from server to client, contrary to http where requests can only be sent from client to server.

- How to execute multiple http requests in parallel rather than sequentially?
  - Expected answer: using Promise.all() or calling first await after last request was started.

- What is the difference between POST and GET HTTP methods?
  - Expected answer: GET requests normally don't include the payload body and are cacheable on CDNs

- What is the OPTIONS method preflight request?

- What is the difference between http and https?
  - https uses ssl certificates to encrypt and sign requests and responses therefore protecting the contents of communication between server and client from ISPs

- What is the purpose of Connection: Keep-Alive header?
  - Expected answer: Connection: Keep-Alive allows you to persist the connection with the server after request ends to reuse it for following requests, which is a significant performance boost especially for high latency requests. Browsers send this header by default.

- What is WebWorkers?
  - Expected answer: an API in browsers that allows you to utilize more than one CPU cores in your application for computation heavy operations, like data compression and video coding

- How would you get the value of a specific URL query parameter from address bar?
  - Expected answer: using new URL(window.location.href).search or new URLSearchParams(window.location.search)

- How does javascript deal with memory allocated for variables after you are done using them?
  - It garbage collects them

- What is regular expressions?
  - A language used to describe the pattern of a string to ensure that it matches a specific format and to extract particular parts of the string.

- Can you describe the purpose of bundlers (webpack/esbuild/browserify/etc...)
  - Bundlers merge all javascript files in your project into a single file to reduce number of requests client has to make to fetch all of the application code. Bundlers also traditionally provide transformations to further optimize application's load speed, like minification of code, tree-shaking. Bundlers also usually allow you to use various language features that are unavailable to vanilla javascript, like jsx, typescript, esnext, etc...

- What is canvas? How do you operate on it?
  - Canvas is an element in html from which you can take a drawing context in javascript. Using drawing context, you can imperatively draw lines, shapes, image files.

- What is innerHTML property in DOM elements? Would you use innerHTML to insert a text content in an html element and how?
  - Expected answer: either "I would rather use textContent" or "I would escape html entities first" because injection

- What is the most common cause of "Maximum call stack size exceeded" error, also known as "Stack Overflow"
  - Infinite recursion

- Could you explain what is the purpose of frameworks like React, Vue, Angular?
  - Coding using these frameworks lets you declaratively express the dependency of displayed elements on the data state of the application, so you only need to write code that will render html for a given variable values instead of imperatively updating every component when data it depends on changes.

- What is race condition?
  - Poorly designed behaviour of the application that relies on the certain order of multiple async calls without means taken to guarantee the execution order.  

## CSS questions (6 questions)

- What is flex?
  - Flex is a relatively new way to describe positioning of elements in CSS that is all about stretching, centering, aligning elements around x/y axis and filling remaining space.

- What are selectors?
  - A syntax to describe a subset of elements on the page to which the styling in the body of the selector will be applied

- How do the animations work in CSS?
  - You define animation keyframes with a unique name and for every keyframe, like 20%, 80% you specify the state of the style attributes of the element. You then reference that keyframes name in a selecter and specify parameters like duration, repetitions count, etc... The animation will play when element enters into the selector coverage.

- Could you describe some of the filter attribute properties?
  - Greyscale makes element greyscale, hue shifts colors, brightness changes brightness, sepia makes all yellow, drop-shadow makes a nice glow.

- What is the difference between margin and padding?

- What are advantages of using separate stylesheets and styling classes rather than inline styling directly in html?
  - Separate stylesheets allow you the separate content from appearance rules which arguably makes code management easier. It also allows you to reuse same styles for more than one element.

## Typescript questions (5 questions)

- What is the difference between any and unknown?
  - Any is a non-type-safe hack, whereas unknown is type safe.

- What are the advantages of strict=true parameter in tsconfig?
  - Without strict=true you lose a lot of type safety: implicit any in functions does not get reported and null checks are not enforced.

- How do you make a class implement an interface in typescript?
  - You can explicitly add "implements IInterfaceName", but that is not mandatory: in typescript any object that has all fields described in the interface will implicitly considered valid implementation of that interface.

- Do types exist at runtime.
  - No. This is one of the official non-goals of the typescript.

- What is the difference between type union and type intersection ("or" and "and" types)?
  - Union broadens the type, allowing it to be either of the elements in the union, whereas intersection narrows the type, limiting allowed values to only those that match every condition of the intersection.


## React questions

- If you have a computation-heavy function used in the rendering, how to make it reuse cached result between re-renderings instead of getting called again and again? Assuming that this function is expressed through props.
  - `useMemo()`. If answered "`useEffect()`", ask for a stateless alternative.

- What is the second parameter of the `useEffect()`? The array that follows the callback parameter.
  - List of values that trigger that callback every time any of them is changed.

 - What is the purpose of `key` attribute?
  - It binds the state of the component to a specific string value: when that value changes between two renders, component is re-created resetting it's internal state.

- When component re-render gets triggered?
  - When any of the props values are changed or internal state is changed.

- If you have an array variable in the state, and you want to add a value to that array, how would you do that and why?
  - `setArr([...arr, newValue])`. `arr.push()` does not trigger re-render in React: object reference has to be changed. 

Ожидаемые ответы предоставлены чтоб помочь собеседователю понять суть вопроса, однако ответ собеседуемого вполне может оказаться более полным/точным, не списывайте такой случай как ошибку ;)


## General programming questions (13 questions)

- You need to execute two SQL write operations together (say, insert a `comment` record and update the `last_commented_on` column in `person` table). How can you guarantee that if one of the operations fails (say, due to a database restart between the two calls), that the changes made by the other operation will not persist either, i.e. that there will be no inconsistent state in database caused by partial update.
  - By wrapping the operations in a transaction: https://en.wikipedia.org/wiki/Database_transaction

- What is the difference between data structures: Set and List?
  - Set does not store duplicate values and provides methods to check for presence of an element in constant time

- What is Binary Search?
  - ожидаемый ответ: "Из отсортированного массива берётся эелемент по середине и сравнивается с искомым значением: если элемент больше искомого, исключаем из поиска половину массива начиная со среднего элемента, иначе исключаем половину до середины. Из оставшейся половины снова берём элемент по середине и снова отсекаем половину, продолжаем до тех пор пока в ходе половинивания не останется 1 элемент - это и будет искомое значение. Логаритмическое время."

- What is the difference between data structures: Queue and Stack?
  - Queue: first-in-first-out, Stack: last-in-first-out

- What is Garbage Collector?
  - A mechanism that releases memory that was reserved for variables that are not referenced by the code anymore. It's contrary to manual memory allocation used in C and Rust where programmer has to allocate and release memory explicitly for every dynamic data structure like list. The advantage of garbage collection is simplicity of code and safety from memory leaks, the disadvantage is performance and stop-the-world events.

- Could you describe how memory is allocated in ArrayList data structure when you insert a new value?
  - A fixed size array with heuristic initial length is created underneath. When the length is reached, a new array is created with new length multiplied by a heuristic factor, like two, all values are then copied from old array to new array.

- Can you tell me what Modulus arithmetic operator does?

- What is Hash Map (aka Map, aka Dictionary, aka Associative Array)
  - ожидаемый ответ: "мап предназначен для хранения и быстрого доступа к элементу по ключу (ключ как правило строка) за константное время"

- How much will be 2 to the power of 10? Do you know what is the most notable use of this number?
  - I wonder how obvious it will be. The intent here is to make applicant say that 1024 is how many bytes are there in a kibibyte.

- What is the difference between interpreted languages (javascript, php, lua, python) and compiled languages (c, c++, Go, Rust)
  - Interpreted languages are compiled in real time, so you execute the code directly. Compiled languages can't be executed directly, they have to be first compiled into a binary .exe file with architecture-specific machine instructions.

- What can you tell abount JIT: bytecode in Java or it's analog CIL/CLR in C#
  - JIT languages are compiled into an intermediary abstract machine language that is not specific to any architecture. They are similarto compiled languages in that they can't be executed directly from source code, and they are also similar to interpreted languages in that their bytecode is interpreted into binary on execution.

- Which of the following is better and why: exponential complexity O(2^N), constant compexity O(1), linear complexity O(N), quadratic complexity O(N^2), logarithmic complexity O(log(N))
  - constant > logarithmic > linear > quadratic > exponential. The complexity says how execution time of the program depends on the number of elements in the input. Constant and logarithmic are super fast, exponential is awfully slow.

- What are the advantages of shifting access permissions check from server side to client side?
  - Nothing, this is a trap question to detect whether person is aware of the common mistake of checking permissions on client where they can be spoofed. Acess permissions must always be checked on server, not on client.

- What is Decentralized Denial of Service attack?
  - Evil programmers sending a lot of dummy requests to the server of good programmers to overburen it and make it inoperable.

- What is the advantage of hosting application on a cloud (like Amazon, Google Cloud, Azure, etc...) over self-hosting it on a local machine

