
_ = require 'underscore'

exec = require('child_process').exec


###
  This is a serial command runner.  
###
module.exports = class CommandExecutor
  
  constructor: (options={}) ->
    @options = _.defaults options,
      # callback method to call with command output as it is available
      onOutput: null
      # callback method to call when command sends to stderr
      onError: null
      # callback method to call on command failure. returning true or options.stopOnFail will stop
      onFail: null
      # set the currentWorking directory for command execution
      cwd: null
      # when true, stop a first command failure, you can manually resume afterwards
      # by calling .nextCommand()
      stopOnFail: true
      
    @commandQueue = []
    @draining = false
    
  ###
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
  ###  
  executeCommands: (commands) ->
    commands = [commands] unless _.isArray(commands)
    @commandQueue = @commandQueue.concat(commands)
    unless @draining
      @nextCommand()
    
  
  cancelCommands: (options={}) ->
    options = _.defaults options,
      quiet: false
      
    return unless @commandQueue?.length > 0
    
    @commandQueue = []
    @draining = false;
    unless options.quiet
      @options.onError?("Canceled")
      @options.onFail?(1)
  
    
  nextCommand: (options = {}) =>
    options = _.defaults options,
      cwd: @options.cwd
      
    unless @commandQueue?.length > 0
      # TODO - add @options onDrained callback?
      @draining = false;
      return 
    
    @draining = true;
    
    cmd = @commandQueue.shift()
    if _.isFunction cmd 
      unless cmd(@) == false
        @nextCommand()
        return
    
    @options.onOutput?("$ #{cmd}")  # echo command prefaced by $
    
    exec cmd, options, (error, stdout, stderr) =>
      if stderr?.lenth > 0
        @options.onError stderr
      if stdout?.length > 0
        @options.onOutput stdout
      if error && (@options.onFail?(error) == false || @options.stopOnFail)
        @cancelCommands(quiet: true)  # we already reported the error, just flush the queue
      
      @nextCommand()  # let continue to stop draining
      
      
    ## I tried doing the above with BufferedProcess, but it was a pain to have to break up args 
    ##    and I would have had to make the commands passed in be broken up into cmd and each arg...
    ##    Really, this how class is overly complicated because of async exec.  Why not just
    ##    loop over an array and execSync until one fails.  No queue, no draining....
    ## The only possible better thing is that the with the child_process.spawn that buffered process
    ## uses, you can get output before the command finishes
  
    # new BufferedProcess 
    #   command: cmd
    #   args: [args]
    #   options: options
    #   stdout: @options.onOutput
    #   stderr: @options.onError
    #   exit: (code) =>
    #     if code && (@options.onFail?(code) == false || @options.stopOnFail)
    #       @cancelCommands(quiet: true)  # we already reported the error, just flush the queue
    #     @nextCommand()  # let continue to stop draining
      
      
    
    
    