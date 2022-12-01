# Update - Dale
Simply clone this branch and load this in vscode. Using `juliaup` make sure to download Julia v1.6. Then within the integrated terminal type
```
julia +1.6
```
Then within the Julia REPL
```
using Pkg; Pkg.activate(mktempdir()); Pkg.add("Revise"); Pkg.develop(path=pwd()); using Revise, Pluto; Pluto.serve_notebook(1234)
```


<h1><img alt="Pluto.jl" src="http://fonsp.com/img/plutologo1.svg" height=100></h1>

Lightweight ***reactive*** notebooks for Julia ⚡

Still under development - we currently have a classical (imperative) notebook system.

<img alt="interactivity screencap" src="http://fonsp.com/img/saturnreactive.gif" height=300>

## Input

The central idea is that Pluto notebooks will be ***reactive***, just like [Observable notebooks](https://observablehq.com/@observablehq/observables-not-javascript), but using Julia instead of JavaScript. _This reactivity is currently under development!_

## Output
Cell output is simple: one cell outputs one variable, which is displayed using the richest available formatter. We believe that this limitation actually [_makes programming easier_](https://medium.com/@mbostock/a-better-way-to-code-2b1d2876a3a0)!

<img alt="formatting screenshot" src="http://fonsp.com/img/saturnformatting.png" height=400>

Plotting is supported out-of-the-box!

<img alt="plotting screenshot" src="http://fonsp.com/img/saturnplotting.png" height=600>

## Installation

_(To developers: follow [these instructions](https://github.com/fonsp/Pluto.jl/blob/master/dev_instructions.md) to start working on the package.)_

To add the package:
```julia
julia> using Pkg; Pkg.add(PackageSpec(url="https://github.com/fonsp/Pluto.jl"))
```

To run the notebook server:
```julia
julia> using Pluto
julia> Pluto.serve(1234)
```

Then go to [`http://localhost:1234/`](http://localhost:1234/) to start coding!

## Note

This package is still in its early days - go to the [issue tracker](https://github.com/fonsp/Pluto.jl/issues) to see what's up!

Let us know what you think! 😊

_Created by [**Fons van der Plas**](https://github.com/fonsp) and [**Mikołaj Bochenski**](https://github.com/malyvsen). Inspired by [Observable](https://observablehq.com/)._
