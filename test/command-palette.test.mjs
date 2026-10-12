import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import CommandPalette,{COMMANDS,findCommands} from '../components/command-palette.mjs';
test('all registered shared domains have exactly one searchable command',()=>{
 assert.equal(COMMANDS.length,11);assert.equal(new Set(COMMANDS.map(c=>c.id)).size,11);
 assert.equal(findCommands('law')[0].id,'legislation');
 assert.equal(findCommands('beats')[0].id,'music');
 assert.equal(findCommands('IDE')[0].id,'code');
 assert.equal(findCommands('no such domain').length,0);
});
test('favorites sort first and preserve relative order',()=>{
 const commands=findCommands('', ['voice','data']);
 assert.deepEqual(commands.slice(0,2).map(x=>x.id),['voice','data']);
});
test('palette semantics, accessibility and provider status are truthful',()=>{
 const html=renderToStaticMarkup(React.createElement(CommandPalette,{active:'research',onChoose:()=>{},defaultOpen:true}));
 assert.match(html,/role="dialog"/);assert.match(html,/aria-modal="true"/);
 assert.match(html,/Search by task, tool or domain/);
 assert.match(html,/AI generation unverified/);
 assert.doesNotMatch(html,/(?:AI generation enabled|Buy credits)/);
});