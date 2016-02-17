{$, View} = require "atom-space-pen-views"
{CompositeDisposable} = require 'atom'

_ = require 'underscore'
BStr = require 'bumble-strings'

DialogView = require './dialog-view'

module.exports = class PublishView extends DialogView
  
  # title is render at display time below.  see updateVersions()
  @renderTitle: () => ""

  
  @renderBodyContent: () ->
    @div class: "left", =>
      @label "New version to publish:"
      @input type: "text", tabindex: 1, outlet: "newVersion"
      @textarea 
        tabindex: 2 
        rows: 4, 
        cols: 40, 
        placeholder: "optional summary description for change log"
        outlet: "description"
    @div class: "right", =>
      @h5 class: "commit-count"
      @div => @label "Include in change log?"
      @div class: "commits scrollbars-visible-always"
      @div class: "scroll-shadow select-controls", =>
        @raw "Select:&nbsp;&nbsp#{@_renderSelectLinks()}"
    
    
  @renderFooterContent: () ->
    super
    @span class: "warnings text-error"

    
  @_renderSelectLinks: () ->
    links = []
    links.push @_renderSelectLink(className, name) for className, name of {
      'select-all': 'all'
      'select-none': 'none'
      'select-stars': ':star: and :bug: only'
    } 
    return links.slice(0, -1).join(', ') + " or " + links.slice(-1)
    
    
  @_renderSelectLink: (className, name) ->
    """<a class="text-info #{className}">#{name}</a>"""
    
    
    
  initialize: () ->
    super
    @saveButton.text("Publish")
    @_initializeSelectLinks()
    

  # takes `commit` objects from GitLog 
  showFor: (currentVersion, newVersion, @commits, @gitStatus, @package) =>
    @show()
    @_updateVersions(currentVersion, newVersion)
    @_updateCommits(@commits)
    @_updateWarnings(@gitStatus)
    
    
  getSaveAttributes: () =>
    selectedCommits = _.filter @commits, (commit) =>
      @find(".commit[data-id='#{commit.id}'] input").prop('checked')
    
    return {
      newVersion: @newVersion.val()
      description: @description.val()
      commits: selectedCommits
    }
    
    
  _initializeSelectLinks: ->
    @find('.select-all').click => @find('.commit input').prop('checked', true) 
    @find('.select-none').click => @find('.commit input').prop('checked', false) 
    @find('.select-stars').click =>
      @find('.commit input').prop('checked', false) 
      for commit in _.filter(@commits, (c) -> BStr.weaklyHas(c.message, [':star:', ':bug']))
        @find(".commit[data-id='#{commit.id}'] input").prop('checked', true)
    
        
  _updateVersions: (currentVersion, newVersion) ->
    @find('.dialog-title').html("Currently at Version: #{currentVersion}")
    @newVersion.val(newVersion)
    @newVersion.focus()
    
    
  _updateCommits: (commits) =>
    $commits = @find('.commits')
    unless commits?.length > 0
      $commits.html("There have not been any commits since the last tag")
      return
    $commits.html("")
    for commit in commits
      $commits.append @_renderCommit(commit)
    
    @find('.commit-count').text("#{commits.length} Commits Since Last Tag")
    return
    
    
  _updateWarnings: (gitStatus) =>
    @find('.warnings').text ''
    unless gitStatus.branch == 'master'
      @find('.warnings').text "Not on master branch, but you probably should be"
    
      
      
    
  _renderCommit: (commit) =>
    return """
      <div class="commit" data-id="#{commit.id}">
        <label><input type="checkbox" checked> #{commit.hash}</label> by #{commit.authorName} #{commit.relativeDate}: #{commit.message}
        #{@_renderCommitLink(commit)}
      </div>
    """
    
  # like https://github.com/littlebee/git-status-utils/commit/19a4528629e9384f5ccd439ff241bb9bd5223cd8
  _renderCommitLink: (commit) =>
    repoUrl = @package.repository?.url || @package.repository 
    unless repoUrl? && BStr.weaklyHas(repoUrl, 'github.com')
      console.log "Publish: repository not found in package json or is not a github repo. not rendering commit link", repoUrl
      return ""
    
    matches = repoUrl.match /[^\:]*\:(\/\/github.com\/)?([^\.]*)/
    commitHref = "https://github.com/#{matches[2]}/commit/#{commit.id}"
      
    return """<a class="text-info" title="view revision diff on github" href="#{commitHref}">...</a>"""
    
    
    
    
