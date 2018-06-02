'use babel'

import _ from 'underscore'
import {exec} from 'child_process'

/*
  This is a serial command runner.
*/
export default class CommandExecutor {

  constructor(options = {}) {
    this.nextCommand = this.nextCommand.bind(this)

    this.options = _.defaults(options, {
      // callback method to call with command output as it is available
      onOutput: null,
      // callback method to call when command sends to stderr
      onError: null,
      // callback method to call on command failure. returning true or options.stopOnFail will stop
      onFail: null,
      // set the currentWorking directory for command execution
      cwd: null,
      // when true, stop a first command failure, you can manually resume afterwards
      // by calling .nextCommand()
      stopOnFail: true,
      // when true, commands are not really executed
      dryRun: false,
    })
    this.commandQueue = []
    this.draining = false
  }

  /*
    commands argument is an array of shell commands to execute serially.

    Commands array can also have function members. If a command is a function
    that function is called after the command before it finishes.

    If a shell command returns an exit code !== 0, then it is considered a fail.
    If a command function returns false it is considered a fail.

    When a fail occurs and constructor option stopOnFail is true (default), then
    all commands and command functions after the fail are cleared (the queue
    is reset) and the onFail construction option is called if set.

    Example - run three commands and then call and then alert the user:
    ```coffeescript
      executor = new CommandExecutor()
      excutor.executeCommands [
        "cp somepath/somefiles someOtherPath/"
        "gzip somefile"
        (-> alert('All finished'))
      ]
    ```
  */
  executeCommands(commands) {
    if (!_.isArray(commands)) { commands = [commands] }
    this.commandQueue = this.commandQueue.concat(commands)

    if (!this.draining) {
      this.nextCommand()
    }
  }

  cancelCommands(options = {}) {
    options = _.defaults(options,
      {quiet: false})

    if (this.commandQueue == null || this.commandQueue.length <= 0) {
      return
    }

    this.commandQueue = []
    this.draining = false

    if (!options.quiet) {
      if (typeof this.options.onError === 'function') {
        this.options.onError('Canceled')
      }
      if (typeof this.options.onFail === 'function') {
        this.options.onFail(1)
      }
    }
  }

  nextCommand(options = {}) {
    options = _.defaults(options, {
      cwd: this.options.cwd,
      timeout: 10000,
    })

    if (this.commandQueue == null || this.commandQueue.length <= 0) {
      // TODO - add @options onDrained callback?
      this.draining = false
      return
    }
    this.draining = true

    const cmd = this.commandQueue.shift()
    if (_.isFunction(cmd)) {
      if (cmd(this) !== false) {
        this.nextCommand()
        return
      }
    }

    if (typeof this.options.onOutput === 'function') {
      if (this.options.dryRun) {
        this.options.onOutput('# DRY RUN: (not really running)')
      }
      // echo command prefaced by $
      this.options.onOutput(`$ ${cmd}`)
    }

    if (!this.options.dryRun) {
      exec(cmd, options, (error, stdout, stderr) => {
        if ((stderr != null ? stderr.lenth : undefined) > 0) {
          this.options.onError(stderr)
        }
        if ((stdout != null ? stdout.length : undefined) > 0) {
          this.options.onOutput(stdout)
        }
        if (error) {
          if (typeof this.options.onFail === 'function') {
            this.options.onFail(error)
          }
          if (this.options.stopOnFail) {
            this.cancelCommands({quiet: true}) // we already reported the error, just flush the queue
          }
        }
        this.nextCommand()
      })
    } else {
      this.nextCommand()
    }
  }
}

// # I tried doing the above with BufferedProcess, but it was a pain to have to break up args
// #    and I would have had to make the commands passed in be broken up into cmd and each arg...
// #    Really, this how class is overly complicated because of async exec.  Why not just
// #    loop over an array and execSync until one fails.  No queue, no draining....
// # The only possible better thing is that with the child_process.spawn that buffered process
// # uses, you can get output before the command finishes

// new BufferedProcess
//   command: cmd
//   args: [args]
//   options: options
//   stdout: @options.onOutput
//   stderr: @options.onError
//   exit: (code) =>
//     if code && (@options.onFail?(code) == false || @options.stopOnFail)
//       @cancelCommands(quiet: true)  # we already reported the error, just flush the queue
//     @nextCommand()  # let continue to stop draining
