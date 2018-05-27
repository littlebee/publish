
const Fs = require('fs')
const Str = require('bumble-strings')
const _ = require('underscore')
const Moment = require('moment')

const tagRegex = /\#\#\s*\[(v?[0-9\.]*)\].*/

module.exports = class ChangeLog {

  constructor(filePath, repoUrl) {
    this.filePath = filePath
    this.repoUrl = repoUrl
    /*
      This is a map of {tag => array of string line content} blocks that make up the 
      file.   There are a couple of special tags like 
        "preface":   contents before first "## [version tag]" in file
    */
    this.contentBlocks = {}
    // so we can reassemble the file in it's original order on write
    this.orderedKeys = []
    // the regex used to identify and parse tag entries
    this.parse()
  }

  /*
    Returns the content lines associated with a particular version tag in the file.
    for example:
    ```javascript
      var versionContents = new ChangeLog().get('v0.2.0')
    ```
    note that the 'v' in the tag is optional and ignored. 
  */
  get(tag) {
    return this.contentBlocks[this._trimTag(tag)]
  }

  set(tag, summary, commits, repoUrl) {
    tag = this._trimTag(tag)
    const existingContent = this.contentBlocks[tag]
    const newContent = [summary, ""].concat(this.generateCommitLines(commits))
    if (existingContent != null) {
      this.contentBlocks[tag] = [existingContent[0]].concat(newContent)
    } else {
      // insert it after the preface
      this.orderedKeys.splice(1, 0, tag)
      this.contentBlocks[tag] = [this.generateTagLine(tag)].concat(newContent)
    }
    return this.contentBlocks[tag]
  }

  parse(filePath = this.filePath) {
    this.contentBlocks = {}
    this.orderedKeys = []
    let currentKey = "preface"
    let currentContentLines = []
    if (Fs.existsSync(filePath)) {
      let rawContent = Fs.readFileSync(filePath)
      if (!rawContent) return null 
      
      let contentLines = rawContent.toString().split(/\r?\n/)
      for (let contentLine of contentLines) {
        const matches = contentLine.match(tagRegex)
        if (matches != null) {
          this.contentBlocks[currentKey] = currentContentLines
          this.orderedKeys.push(currentKey)
          currentKey = matches[1]
          currentContentLines = []
        }
        currentContentLines.push(contentLine)
      }
      this.contentBlocks[currentKey] = currentContentLines
      this.orderedKeys.push(currentKey)
      return this.orderedKeys = _.uniq(this.orderedKeys)
    }
  }

  write(filePath = this.filePath) {
    const orderedBlocks = (this.orderedKeys.map((key) => this.contentBlocks[key]))
    return Fs.writeFileSync(filePath, _.flatten(orderedBlocks).join('\n'))
  }

  /*
    generates the markdown for the ## version tag line 
  */
  generateTagLine(tag, options={}) {
    options = _.defaults(options,
      {repoUrl: this.repoUrl})
    const previousTag = this.orderedKeys[this.orderedKeys.indexOf(tag) + 1] || "0.0.0"
    return `## [${tag}](${options.repoUrl}/compare/${previousTag}...${tag}) (${Moment().format('YYYY-MM-D')})`
  }

  generateCommitLines(commits, repoUrl=this.repoUrl) {
    if ((commits != null ? commits.length : undefined) <= 0) { return []; }
    const commitLines = []
    const commitsByType = {
      bugs: [],
      features: [],
      other: []
    }
    for (var commit of commits) {
      switch (false) {
        case !Str.weaklyHas(commit.message, ':bug:'): commitsByType.bugs.push(commit); break
        case !Str.weaklyHas(commit.message, ':star:'): commitsByType.features.push(commit); break
        default: commitsByType.other.push(commit)
      }
    }

    for (let [group, name] of [['bugs', 'Bugs Fixed in this Release'], ['features', "New Features"], ['other', "Other Commits"]]) {
      if (commitsByType[group].length <= 0) { continue; }
      commitLines.push(`### ${name}`)
      for (commit of commitsByType[group]) {
        commitLines.push(`* [${commit.hash}](${repoUrl}/commit/${commit.id}) ${commit.message.replace(/\:(bug|star)\:/g, '')}`)
      }
      commitLines.push("")
    }

    return commitLines
  }

  _trimTag(tag) {
    tag = Str.trim(tag)
    if (Str.weaklyStartsWith(tag, 'v')) {
      tag = tag.slice(1)
    }
    return tag
  }
}
