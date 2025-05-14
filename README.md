# custom-assistant-example-error-augmentation
This assistant example is designed to explain student programming error messages.

Additional features:
- Only activates "I can help explain this error" tooltip for errors, doesn't show it for autograder feedback
- Filter information from context by using specific guidelines in the prompts to ignore certain information
- Passes all open files as student code context

Tweak the `systemPrompt` or `userPrompt` to change/edit/update custom explanations or if you'd prefer a certain style of explanation. 
for eg. with or without code snippets, with or without potential fixes and/or misconceptions, etc.
