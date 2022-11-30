# Update - Dale
Simply clone this branch and load this in vscode. Using `juliaup` make sure to download Julia v1.6. Then within the integrated terminal type
```
julia +1.6
```
Then within the Julia REPL
```
using Pkg; Pkg.activate(mktempdir()); Pkg.add("Revise"); Pkg.develop(path=pwd()); using Revise, Pluto; Pluto.serve_notebook(1234)
```