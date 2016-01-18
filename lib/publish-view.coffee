{$, View} = require "atom-space-pen-views"
{CompositeDisposable} = require 'atom'

DialogView = require './dialog-view'

module.exports = class PublishView extends DialogView
  
  @getTitle: () =>
    
  
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
      @div class: "commits"
      @div class: "scroll-shadow"
    
    
  initialize: () ->
    super
    @saveButton.text("Publish")
    

  # takes `commit` objects from GitLog 
  showFor: (currentVersion, newVersion, @commits) =>
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
        <a href="#{commit.link}">#{commit.hash}</a> 
        by #{commit.authorName} #{commit.relativeDate}:
        <div>
          #{commit.message}
        </div>
      </div>
    """
    
