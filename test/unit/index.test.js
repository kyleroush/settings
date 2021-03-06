const { Application } = require('probot')
const any = require('@travi/any')
const plugin = require('../../index')

describe('plugin', () => {
  let app, event, sync, checks

  beforeEach(() => {
    checks = {
      create: jest.fn(() => Promise.resolve())
    }
    class Octokit {
      static defaults () {
        return Octokit
      }

      constructor () {
        this.request = jest.fn(() => Promise.resolve({ data: { content: '' } }))
        this.repos = {
          getContents: jest.fn(() => Promise.resolve({ data: { content: '' } }))
        }
        this.checks = checks
        this.apps = {
          getInstallation: jest.fn(() => Promise.resolve({ data: { permissions: { checks: 'write' } } }))
        }
      }
    }

    app = new Application({ secret: any.string(), Octokit })

    event = {
      name: 'push',
      payload: JSON.parse(JSON.stringify(require('../fixtures/events/push.settings.json')))
    }
    sync = jest.fn(() => Promise.resolve())

    plugin(app, {}, { sync, FILE_NAME: '.github/settings.yml' })
  })

  describe('with settings modified on master', () => {
    it('syncs settings', async () => {
      await app.receive(event)
      expect(sync).toHaveBeenCalled()
    })

    describe('the settings are synced successfully', () => {
      it('creates a check as a success', async () => {
        await app.receive(event)
        expect(checks.create).toHaveBeenCalledWith(expect.objectContaining({
          conclusion: 'success'
        }))
      })
    })

    describe('there is an error when syncing the settings', () => {
      beforeEach(() => {
        const error = new Error()
        error.message = '{}'
        sync = jest.fn(() => Promise.reject(error))
        plugin(app, {}, { sync, FILE_NAME: '.github/settings.yml' })
      })
      it('creates a check as a failure', async () => {
        await app.receive(event)
        expect(checks.create).toHaveBeenCalledWith(expect.objectContaining({
          conclusion: 'failure'
        }))
      })
    })
  })

  describe('on another branch', () => {
    beforeEach(() => {
      event.payload.ref = 'refs/heads/other-branch'
    })

    it('does not sync settings', async () => {
      await app.receive(event)
      expect(sync).not.toHaveBeenCalled()
    })
  })

  describe('with other files modified', () => {
    beforeEach(() => {
      event.payload = require('../fixtures/events/push.readme.json')
    })

    it('does not sync settings', async () => {
      await app.receive(event)
      expect(sync).not.toHaveBeenCalled()
    })
  })

  describe('default branch changed', () => {
    beforeEach(() => {
      event = {
        name: 'repository.edited',
        payload: require('../fixtures/events/repository.edited.json')
      }
    })

    it('does sync settings', async () => {
      await app.receive(event)
      expect(sync).toHaveBeenCalled()
    })
  })

  describe('repository created', () => {
    beforeEach(() => {
      event = {
        name: 'repository.created',
        payload: require('../fixtures/events/push.settings.json')
      }
    })

    it('does sync settings', async () => {
      await app.receive(event)
      expect(sync).toHaveBeenCalled()
    })
  })
})
