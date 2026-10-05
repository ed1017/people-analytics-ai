# Plain Action Plan assumption labels

Reader-facing Action Plan labels now say **Assumed**, with **Starting estimates you can change.** shown once beneath the assumptions control. The change covers summaries, comparison values, assumption details, chat-review labels, edit-basis labels and success-measure labels. User-entered assumptions and recorded baselines retain their distinct labels, and effect/readiness caveats remain.

This is a display change. Persisted `illustrative` provenance kinds, original bases, preset version identifiers, scenario values, calculations and attachment history are unchanged. The preset identifier has a plain display alias; it is not rewritten in storage. Research artifacts and model/data contracts are not relabeled. No legacy controls are removed in this checkpoint.

Validation: 1,096 unit tests; 207 browser checks (48 conditional scenarios, 117 unified attachment, 42 explicit-rate preservation); lint, TypeScript, build and whitespace checks pass. Checks cover the single explanation, edited assumptions, unchanged historical snapshots and desktop/mobile/200%-equivalent reflow. This checkpoint follows numeric/delivery-routing checkpoint `2b5a61db8fa94d4c30e21489ba84af2ec3b3f441` and remains local pending review. Guided Example is still queued separately after core acceptance.
