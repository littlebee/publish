
Fs = require 'fs'
Str = require 'bumble-strings'
_ = require 'underscore'
Moment = require 'moment'


module.exports = class ChangeLog

  ###
    This is a map of {tag => array of string line content} blocks that make up the 
    file.   There are a couple of special tags like 
      "preface":   contents before first "## [version tag]" in file
  ###
  contentBlocks = {}
  # so we can reassemble the file in it's original order on write
  orderedKeys = []
  # the regex used to identify and parse tag entries
  tagRegex = /\#\#\s*\[(v?[0-9\.]*)\].*/
  
  
  constructor: (@filePath, @repoUrl) ->
      
    @parse()
    
    
  ###
    Returns the content lines associated with a particular version tag in the file.
    for example:
    ```javascript
      var versionContents = new ChangeLog().get('v0.2.0')
    ```
    note that the 'v' in the tag is optional and ignored. 
  ###
  get: (tag) ->
    return contentBlocks[@_trimTag(tag)]
    
    
  set: (tag, summary, commits, repoUrl) ->
    tag = @_trimTag(tag)
    existingContent = @contentBlocks[tag]
    newContent = [summary, ""].concat @generateCommitLines(commits)
      
    if existingContent?
      @contentBlocks[tag] = [existingContent[0]].concat(newContent)
    else
      # insert it after the preface
      @orderedKeys.splice(1, 0, tag)
      @contentBlocks[tag] = [@generateTagLine(tag)].concat(newContent)
    
    
  parse: (filePath = @filePath) ->
    @contentBlocks = {}
    @orderedKeys = []
    currentKey = "preface"
    currentContentLines = []
    
    if Fs.existsSync(filePath)
      for contentLine in Fs.readFileSync(filePath)?.toString().split(/\r?\n/) || []
        matches = contentLine.match tagRegex
        if matches?
          @contentBlocks[currentKey] = currentContentLines
          @orderedKeys.push currentKey
          currentKey = matches[1]
          currentContentLines = []
        
        currentContentLines.push contentLine
        
      @contentBlocks[currentKey] = currentContentLines
      @orderedKeys.push currentKey
      @orderedKeys = _.uniq @orderedKeys
    
    
  write: (filePath = @filePath) ->
    orderedBlocks = (@contentBlocks[key] for key in @orderedKeys)
    Fs.writeFileSync(filePath, _.flatten(orderedBlocks).join('\n'))
    
        
  ###
    generates the markdown for the ## version tag line 
  ###
  generateTagLine: (tag, options={}) ->
    options = _.defaults options,
      repoUrl: @repoUrl
    
    previousTag = @orderedKeys[@orderedKeys.indexOf(tag) + 1] || "0.0.0"
    return "## [#{tag}](#{options.repoUrl}/compare/#{previousTag}...#{tag}) (#{Moment().format('YYYY-MM-DDD')})"
    
    
  generateCommitLines: (commits, repoUrl=@repoUrl) ->
    return [] unless commits?.length > 0
    commitLines = []
    commitsByType = {
      bugs: []
      features: []
      other: []
    } 
    for commit in commits
      switch
        when Str.weaklyHas(commit.message, ':bug:') then commitsByType.bugs.push commit
        when Str.weaklyHas(commit.message, ':star:') then commitsByType.features.push commit
        else commitsByType.other.push commit
    
    for [group, name] in [['bugs', 'Bugs Fixed in this Release'], ['features', "New Features"], ['other', "Other Commits"]]
      continue unless commitsByType[group].length > 0
      commitLines.push "### #{name}"
      for commit in commitsByType[group]
        commitLines.push "* [#{commit.hash}](#{repoUrl}/commit/#{commit.id}) #{commit.message.replace(/\:(bug|star)\:/g, '')}"
      commitLines.push ""
    
    return commitLines
    
    
  _trimTag: (tag) ->
    tag = Str.trim(tag)
    if Str.weaklyStartsWith(tag, 'v')
      tag = tag.slice(1)
    return tag
    
    
  
  
    
    
  
    
    