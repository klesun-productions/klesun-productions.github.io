# Senior Full Stack Developer questions
                                   author: Artur Klesun

## Abstract

This document is to be used as a reference for the interviewing Full Stack Developer position candidates to measure their knowledge/competence.

For general programming questions refer to https://github.com/klesun-productions/klesun-productions.github.io/blob/master/entry/public_personal/interview_plan_junior_frontend.md

## Javascrpt questions

- What is WebSockets?
  - Expected answer: a protocol used in browsers that allows sending messages from server to client, contrary to http where requests can only be sent from client to server.

- How to execute multiple http requests in parallel rather than sequentially?
  - Expected answer: using Promise.all() or calling first await after last request was started.

- What is the difference between POST and GET HTTP methods?
  - Expected answer: GET requests normally don't include the payload body and are cacheable on CDNs

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

- Let's say you have a large data set of 20000 rows. You need to display them as a table on the page. Would you display all 20000 of them in one big piece or would you rather use pagination and why?
  - You would use pagination since rendering a table with so many rows will cause freezes.

## CSS questions

- What is flex?
  - Flex is a relatively new way to describe positioning of elements in CSS that is all about stretching, centering, aligning elements around x/y axis and filling remaining space.

- What are selectors?
  - A syntax to describe a subset of elements on the page to which the styling in the body of the selector will be applied

- How do the animations work in CSS?
  - You define animation keyframes with a unique name and for every keyframe, like 20%, 80% you specify the state of the style attributes of the element. You then reference that keyframes name in a selecter and specify parameters like duration, repetitions count, etc... The animation will play when element enters into the selector coverage.

- Could you describe some of the filter attribute properties?
  - Greyscale makes element greyscale, hue shifts colors, brightness changes brightness, sepia makes all yellow, drop-shadow makes a nice glow.

- What does margin:auto do?
  - Centers the element.

- What are advantages of using separate stylesheets and styling classes rather than inline styling directly in html?
  - Separate stylesheets allow you the separate content from appearance rules which arguably makes code management easier. It also allows you to reuse same styles for more than one element.

## Typescript questions

- What is the difference between any and unknown?
  - Any is a non-type-safe hack, whereas unknown is type safe.

- What are the advantages of strict=true parameter in tsconfig?
  - Without strict=true you lose a lot of type safety: implicit any in functions does not get reported and null checks are not enforced.

- How do you make class implement an interface in typescript?
  - You can explicitly add "implements IInterfaceName", but that is not mandatory: in typescript any object that has all fields described in the interface will implicitly considered valid implementation of that interface.

- Do types exist at runtime.
  - No. This is one of the official non-goals of the typescript.

- What is the difference between type union and type intersection ("or" and "and" types)?
  - Union broadens the type, allowing it to be either of the elements in the union, whereas intersection narrows the type, limiting allowed values to only those that match every condition of the intersection.