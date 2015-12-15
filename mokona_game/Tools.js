var Ns = Ns || {};

Ns.lim = (n,r,l) => Math.min(Math.max(n, l || -r), r);

Ns.toZero = (x,dx) =>
    x > 0 ? Math.max(0, x - dx) :
    x < 0 ? Math.min(0, x + dx) :
    0;