// Wrapping the whole extension in a JS function and calling it immediately 
// (ensures all global variables set in this extension cannot be referenced outside its scope)
(async function(codioIDE, window) {
  
  // Refer to Anthropic's guide on system prompts: https://docs.anthropic.com/claude/docs/system-prompts
  const systemPrompt = `You are a helpful assistant helping students understand programming error messages.

You will be provided with the assignment instructions in the <assignment> tag, 
all the student code files in the <code> tag and a programming error message in the <error_message> tag.

- Carefully review the <assignment> and <code>, if provided, to understand the context of the error
- Explain what is causing the error only.
- Do not provide possible fixes and solutions.
- If relevant, mention any common misconceptions that may be contributing to the student's error
- When referring to code in your explanation, use markdown syntax - wrap inline code with \` and
multiline code with \`\`\`
  `

  codioIDE.onErrorState(async (isError, error) => {
    console.log('codioIDE.onErrorState', {isError, error})

    // This statement checks for the following:
    // 1. is there errorState true 
    // 2. is there any error text (make sure it is not empty, which might be the case with autograder feedback)
    // 3. does the error text contain any update available messages? (so that we can ignore npm updates)
    // Once all these conditions have been met, only then we'll show the I can explain this error tooltip  
    if ((isError) && (error.length > 0) && (!error.includes("npm notice"))) {
      codioIDE.coachBot.showTooltip("I can help explain this error...", () => {
        codioIDE.coachBot.open({id: "eCornellErrorAugmentButton", params: "tooltip"})
      })
    }
  })

  // register(id: unique button id, name: name of button visible in Coach, function: function to call when button is clicked) 
  codioIDE.coachBot.register("eCornellErrorAugmentButton", "Explain this error!", onButtonPress)

  async function onButtonPress(params) {
    // Function that automatically collects all available context 
    // returns the following object: {guidesPage, assignmentData, files, error}

    let context = await codioIDE.coachBot.getContext()
    // console.log(`This is the context object \n\n`, context)

    var all_open_files = ""

    for (const [fileIndex, file] of Object.entries(context.files)) {
      // console.log("This is the file object", file)
      all_open_files += `
      -----------------------------
      File Number: ${parseInt(fileIndex)+1}
      File name: ${file.path.split('/').pop()}
      File path: ${file.path}
      File content: 
      ${file.content}
      -----------------------------
      `
    }
    // console.log(`These are concatenated all open files\n\n ${all_open_files}`)

    let input

    if (params == "tooltip") { 
      input = context.error.text
      codioIDE.coachBot.write(context.error.text, codioIDE.coachBot.MESSAGE_ROLES.USER)
    } else {

      try {
        input = await codioIDE.coachBot.input("Please paste the error message you want me to explain!")
      }  catch (e) {
          if (e.message == "Cancelled") {
            codioIDE.coachBot.write("Please feel free to have any other error messages explained!")
            codioIDE.coachBot.showMenu()
            return
          }
      }
    }
    
    // console.log(input)

    const valPrompt = `<Instructions>

Please determine whether the following text appears to be a programming error message or not:

<text>
${input}
</text>

Output your final Yes or No answer in JSON format with the key 'answer'

Focus on looking for key indicators that suggest the text is an error message, such as:

- Words like "error", "exception", "stack trace", "traceback", etc.
- Line numbers, file names, or function/method names
- Language that sounds like it is reporting a problem or issue
- Language that sounds like it is providing feedback
- Technical jargon related to coding/programming

If you don't see clear signs that it is an error message, assume it is not. 
Only answer "Yes" if you are quite confident it is an error message. 
If it is not a traditional error message, only answer "Yes" if it sounds like it is providing feedback as part of an automated grading system.

</Instructions>"`

    const validation_result = await codioIDE.coachBot.ask({
        systemPrompt: "You are a helpful assistant.",
        userPrompt: valPrompt
    }, {stream:false, preventMenu: true})

    if (validation_result.result.includes("Yes")) {
        //Define your assistant's userPrompt - this is where you will provide all the context you collected along with the task you want the LLM to generate text for.
        const userPrompt = `
Here is the error message:

<error_message>
${input}
</error_message>

Here is the description of the programming assignment the student is working on:

<assignment>
${context.guidesPage.content}
</assignment>

Note: Here is a list of items that are not part of the assignment instructions:
1. Anything in html <style> tags.
2. Anything in htmk <script> tags.
3. Anything that resembles autograder feedback about passing or failing tests, i.e. check passed, total passed, total failed, etc.

If any of the above are present in the <assignment>, ignore them as if they're not provided to you

Here are the student's code files:
<code>
${all_open_files}
</code>

If <assignment> and <code> are empty, assume that they're not available. 

Phrase your explanation directly addressing the student as 'you'. 
After writing your explanation in 2-3 sentences, double check that it does not suggest any fixes or solutions. 
The explanation should only describe the cause of the error.`
      
      console.log("user prompt", userPrompt)
      const result = await codioIDE.coachBot.ask({
        systemPrompt: systemPrompt,
        messages: [{"role": "user", "content": userPrompt}]
      })
    }
    else {
        codioIDE.coachBot.write("This doesn't look like an error. I'm sorry, I can only help you by explaining programming error messages.")
        codioIDE.coachBot.showMenu()
    }
  }

})(window.codioIDE, window)
