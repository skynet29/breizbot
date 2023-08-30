//@ts-check

import * as Blockly from 'blockly/core';
import * as javascript from 'blockly/javascript';

import * as LexicalVariables from '@mit-app-inventor/blockly-block-lexical-variables';

window.LexicalVariables = LexicalVariables
window.Blockly = Blockly
window.javascript = javascript


$$.service.registerService('breizbot.blockly', {
    init: function (config) {
        function inject(elt, toolbox) {
            const workspace = Blockly.inject(elt,
                {
                    media: '../ext/blockly/media/',
                    toolbox
                    //horizontalLayout: true,
                    //toolboxPosition: 'end'
                }
            )
            LexicalVariables.init(workspace);
        }
        return {inject}
    }
})