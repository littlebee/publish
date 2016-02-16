{$, View} = require "atom-space-pen-views"
{CompositeDisposable} = require 'atom'

BStr = require 'bumble-strings'

DialogView = require './dialog-view'

module.exports = class PublishView extends DialogView
  
  @getTitle: () => ""
    
  
  @innerContent: () ->
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
      @div class: "commits scrollbars-visible-always"
      @div class: "scroll-shadow"
    
    
  initialize: () ->
    super
    @saveButton.text("Publish")
    

  # takes `commit` objects from GitLog 
  showFor: (currentVersion, newVersion, @commits, @gitStatus, @package) =>
    @show()
    @_updateVersions(currentVersion, newVersion)
    @_updateCommits(@commits)
    
    
  getSaveAttributes: () =>
    return {
      newVersion: @newVersion.val()
      description: @description.val()
      commits: @commits
    }
    
        
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
    
  _renderCommit: (commit) =>
    return """
      <div class="commit">
        #{@_renderCommitLink(commit)} by #{commit.authorName} #{commit.relativeDate}: #{commit.message}
      </div>
    """
    
  # like https://github.com/littlebee/git-status-utils/commit/19a4528629e9384f5ccd439ff241bb9bd5223cd8
  _renderCommitLink: (commit) =>
    repoUrl = @package.repository?.url || @package.repository 
    unless repoUrl? && BStr.weaklyHas(repoUrl, 'github.com')
      console.log "Publish: repository not found in package json or is not a github repo. not rendering commit link", repoUrl
      return commit.hash
    
    matches = repoUrl.match /[^\:]*\:(\/\/github.com\/)?([^\.]*)/
    commitHref = "https://github.com/#{matches[2]}/commit/#{commit.id}"
      
    return """<a class="text-info" href="#{commitHref}">#{commit.hash}</a>"""
    
    
    
    
