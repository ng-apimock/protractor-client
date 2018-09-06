(() => {
    const {Before, Given, When, Then, setDefaultTimeout} = require('cucumber');

    setDefaultTimeout(60 * 1000);

    const page = new (require('../pos/page.po'))();
    const fs = require('fs-extra');
    const path = require('path');
    const mocksDirectory = path.join(require.resolve('@ng-apimock/test-application'), '..', '..', 'mocks');

    let responses;

    Before(async () => {
        // perform some shared setup
        responses = {
            getItems: fs.readJsonSync(path.join(mocksDirectory, 'get-items.mock.json')).responses,
            postItem: fs.readJsonSync(path.join(mocksDirectory, 'post-item.mock.json')).responses
        };

        responses.getItems['passThrough'] = {status: 200, data: ['passThrough']};
        responses.postItem['passThrough'] = {status: 200, data: ['passThrough']};
    });

    Given(/^I open the test page$/, openTestPage);

    When(/^I download the binary file$/, downloadTheBinaryFile);
    When(/^I enter (.*) and post the item$/, enterAndPostItem);
    When(/^I get the items$/, getTheItems);
    When(/^I get the items as jsonp$/, getTheItemsAsJsonp);

    Then(/^the items are fetched$/, checkItemsAreFetched);
    Then(/^the items are not yet fetched$/, checkItemsAreNotYetFetched);
    Then(/^the response is interpolated with variable (.*)$/, checkResponseIsInterpolatedWithVariable);
    Then(/^the (.*) response is returned for get items$/, checkReturnedResponseForGetItems);
    Then(/^the (.*) response is returned for post item$/, checkReturnedResponseForPostItem);
    Then(/^the (.*) response is downloaded$/, checkResponseIsDownloaded);

    async function checkItemsAreFetched() {
        browser.ignoreSynchronization = false;
        expect(await page.done.getText()).to.equal('true');
    }

    async function checkItemsAreNotYetFetched() {
        expect(await page.done.getText()).to.equal('false');
    }

    async function checkResponseIsDownloaded(scenario) {
        await browser.wait(() => {
            if (fs.existsSync(browser.params.default_directory + '/test.pdf')) {
                const actual = fs.readFileSync(browser.params.default_directory + '/test.pdf');
                const expected = fs.readFileSync(path.join(mocksDirectory, responses.getItems[scenario].file));
                return actual.equals(expected);
            } else {
                return browser.params.environment === 'CI'
            }
        }, 5000);
    }

    async function checkResponseIsInterpolatedWithVariable(variable) {
        expect(await page.data.getText()).to.contain(variable);
    }

    async function checkReturnedResponseForGetItems(scenario) {
        if (responses.getItems[scenario].data !== undefined) {
            const data = await page.data.getText();
            expect(JSON.parse(data)).to.deep.equal(responses.getItems[scenario].data);
        }
        const status = await page.status.getText();
        expect(parseInt(status)).to.equal(responses.getItems[scenario].status);
    }

    async function checkReturnedResponseForPostItem(scenario) {
        if (responses.postItem[scenario].data !== undefined) {
            const data = await page.data.getText();
            expect(JSON.parse(data)).to.deep.equal(responses.postItem[scenario].data)
        }
        const status = await page.status.getText();
        expect(parseInt(status)).to.equal(responses.postItem[scenario].status);
    }

    async function downloadTheBinaryFile() {
        await page.buttons.binary.click();
    }

    async function enterAndPostItem(data) {
        await page.input.clear().sendKeys(data);
        await page.buttons.post.click();
    }

    async function getTheItems() {
        await page.buttons.get.click();
    }

    async function getTheItemsAsJsonp() {
        await page.buttons.getAsJsonp.click();
    }

    async function openTestPage() {
        await page.open();
    }
})();
