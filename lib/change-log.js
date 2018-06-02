'use babel'

import Fs from 'fs'
import Str from 'bumble-strings'
import _ from 'underscore'
import Moment from 'moment'

export default class ChangeLog {

  constructor(filePath, repoUrl) {
    this.filePath = filePath
    this.repoUrl = repoUrl
  }

  preview(newVersionTag, summary, commits, options = {}) {
    options = _.defaults(options, {
      includeFullFile: false,
    })
    const tag = this._trimTag(newVersionTag)
    const existingContents = Fs.existsSync(this.filePath) ?
      Fs.readFileSync(this.filePath).toString() : ''

    let newContent = this._generateTagLine(tag) + '\n' +
      (summary || '') + '\n' +
      this._generateCommitLines(commits) + '\n'

    if (options.includeFullFile) {
      newContent += existingContents
    }
    return newContent
  }

  update(newVersionTag, summary, commits) {
    Fs.writeFileSync(this.filePath,
      this.preview(newVersionTag, summary, commits, {includeFullFile: true}))
  }

  /*
    generates the markdown for the ## version tag line
  */
  _generateTagLine(tag, options = {}) {
    options = _.defaults(options,
      {repoUrl: this.repoUrl})
    // const previousTag = this.orderedKeys[this.orderedKeys.indexOf(tag) + 1] || '0.0.0'
    // TODO add compare URL
    // return `## [${tag}](${options.repoUrl}/compare/${previousTag}...${tag}) (${Moment().format('YYYY-MM-D')})`
    return `## [${tag}] (${Moment().format('YYYY-MM-D')})`
  }

  _generateCommitLines(commits, repoUrl = this.repoUrl) {
    if ((commits != null ? commits.length : undefined) <= 0) { return [] }
    const commitLines = []
    const commitsByType = {
      bugs: [],
      features: [],
      other: [],
    }
    for (const commit of commits) {
      switch (false) {
      case !Str.weaklyHas(commit.message, ':bug:'): commitsByType.bugs.push(commit); break
      case !Str.weaklyHas(commit.message, ':star:'): commitsByType.features.push(commit); break
      default: commitsByType.other.push(commit)
      }
    }
    const groups = [['bugs', 'Bugs Fixed in this Release'], ['features', 'New Features'], ['other', 'Other Commits']]
    for (const [group, name] of groups) {
      if (commitsByType[group].length <= 0) { continue }
      commitLines.push(`### ${name}`)
      for (const commit of commitsByType[group]) {
        commitLines.push(`* [${commit.hash}](${repoUrl}/commit/${commit.id}) ` +
          commit.message.replace(/\:(bug|star)\:/g, ''))
      }
      commitLines.push('')
    }
    return commitLines.join('\n')
  }

  _trimTag(tag) {
    tag = Str.trim(tag)
    if (Str.weaklyStartsWith(tag, 'v')) {
      tag = tag.slice(1)
    }
    return tag
  }
}
