# Te Reo Māori locale (`mi`): translators' note

The `mi` locale is a machine-drafted translation. A native speaker of te reo
Māori has not yet reviewed it. Treat all `mi` strings as draft text until that
review is complete.

Scope of the draft:

- `internal/translations/{common,home,index,maker,readme,recover}/mi.json`
- `internal/html/docs-content/mi.md`

Conventions used:

- Proper nouns stay in English: Kaitiaki, Bitcoin, age, GitHub, drand, Shamir.
- Technical loanwords with no settled te reo term stay in English: ZIP, QR,
  USB, CLI, PDF, YAML, recover.html, MANIFEST.age.
- "Guardian" is "kaitiaki"; plural "ngā kaitiaki".

## Term choices that most need review

| English | Draft te reo | Note |
| --- | --- | --- |
| bundle | paihere | Core product noun. Confirm it reads well for a digital parcel. |
| share / piece (Shamir) | wāhanga | One word for both senses. Loses the Shamir "share" nuance. |
| threshold | tatau iti rawa (forms), tatau paepae (docs) | Two variants survived the draft. Pick one; plain "paepae" is also a candidate. |
| encrypt / decrypt | whakamuna / wetemuna | "wetemuna" is less established than "whakamuna". |
| offline | tuimotu | Not universal. Leaving "offline" in English is an option. |
| browser | pūtirotiro | Settled computing term, but sits next to untranslated "recover.html". |
| time lock | raka ā-wā | Closest thing to a coined term in this draft. |
| recovery tool | taputapu whakaora | "taputapu" can read as a physical implement. |
| holder (anonymous mode) | kaipupuri | Used to keep "holder" distinct from "kaitiaki". |
| recovered / restore | whakaora / whakaorangia | Passive forms need a grammar check throughout. |

Also flag for review: the zero-knowledge claim in `mi.md`
("kāore he mōhiohio..." sentence about shares below the threshold) uses an
awkward double negative and the claim is load-bearing.
