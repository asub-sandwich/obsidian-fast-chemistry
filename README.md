# Obsidian Fast Chemistry Plugin

Fast Chemistry is an incredibly hacky shorthand way to quickly render chemical formulas in Obsidian Markdown. Fast Chemistry uses latex-like annotations (@ instead of $) to insert the rather clunky `$\ce{...}$` for you:

`@NH4+ -> NH3 + H+@` becomes `$\ce{NH4+ -> NH3 + H+}$`

and
```
@@
5 C6H12O6 + 24 NO3- + 24 H+ -> 30 CO2 + 12 N2 + 42 H2O
@@
```
becomes
```
$$
\ce{5 C6H12O6 + 24 NO3- + 24 H+ -> 30 CO2 + 12 N2 + 42 H2O}
$$
```

There is also a setting that allows you to manually convert with a hotkey instead of when the final @ is placed. 
