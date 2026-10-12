import test from 'node:test';import assert from 'node:assert/strict';
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {ProjectPortal,buildProjectTransfer,parseProjectTransfer} from '@superintelligence/ui';
test('professional interface uses the same artifact and project IDs as Academy',()=>{
 const tenant='00000000-0000-4000-8000-000000000041',project='00000000-0000-4000-8000-000000000042';
 const back=buildProjectTransfer('https://academy.example',tenant,project);
 assert.deepEqual(parseProjectTransfer(back),{tenantId:tenant,projectId:project});
 const html=renderToStaticMarkup(React.createElement(ProjectPortal,{product:'command',domain:'research',engineOrigin:''}));
 assert.match(html,/data-product="command"/);assert.match(html,/Shared project storage is not configured/);
 assert.doesNotMatch(html,/Tutor|Guided lesson|Sample project/);
});
