# Grade 1 object interaction contract

`lowerPrimaryClassifySortMatchPattern.ts` supplies deterministic grading for
four concrete-object modes used in Grade 1 missions:

| Mode | Learner response | Expected value |
| --- | --- | --- |
| `classify` | item id to group id | group id |
| `sort` | item id to position | integer position |
| `match` | item id to partner id | partner id |
| `pattern` | blank id to next item id | item id |

The client may present drag controls, but must provide a tap alternative and
submit the same JSON object. The authored `expected` map remains server-side;
the learner receives only cards, targets, prompt, feedback, and retry hint.
Every expected item must be answered exactly once. Extra, missing, or incorrect
entries produce the authored retry hint, never a generated answer.
