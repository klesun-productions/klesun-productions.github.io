
// worker for tests

importScripts('/libs/require.js');

let wanted = ['/src/entry/Worker.js'];
requirejs(wanted, function(Worker) {
    let io = {
        postMessage: (data) => postMessage(data),
        onmessage: (data) => {}, // override me please!
    };
    onmessage = (e) => io.onmessage(e.data);

    return Worker.Worker(io);
});



// let functions = {
//     loadCpuCore: function() {
//         let randomStats = new Map([
//             [0.1, 0],
//             [0.2, 0],
//             [0.3, 0],
//             [0.4, 0],
//             [0.5, 0],
//             [0.6, 0],
//             [0.7, 0],
//             [0.8, 0],
//             [0.9, 0],
//             [1.0, 0],
//         ]);
//         for (let i = 0; i < 100000000; ++i) {
//             let rand = Math.random();
//
//             for (let [border, amount] of randomStats) {
//                 if (rand < border) {
//                     randomStats.set(border, amount + 1);
//                     break;
//                 }
//             }
//         }
//     },
// };
//
// io.onmessage = function(e) {
//     let postParams = e.data;
//     let functionName = postParams.f;
//     if (functionName in functions) {
//         let result = functions[f]();
//         io.postMessage({result: result});
//     } else {
//         io.postMessage({error: 'unknown function name: ' + postParams.f});
//     }
// };