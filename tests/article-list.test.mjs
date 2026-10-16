import test from 'node:test';
import assert from 'node:assert/strict';
import {articlePage} from '../public/assets/article-list.js';

test('article search covers the whole collection and resets/clamps pagination',()=>{
 const articles=Array.from({length:25},(_,i)=>({title:'HR文章'+i,description:i===24?'跨页搜索目标':'工资',category:'HR实务'}));
 assert.equal(articlePage(articles,'',3).items.length,1);
 assert.equal(articlePage(articles,'跨页搜索目标').items[0].title,'HR文章24');
 assert.equal(articlePage(articles,'hr').total,25);
 assert.equal(articlePage(articles,'无匹配',99).current,1);
 assert.equal(articlePage(articles,'',999).current,3);
 assert.equal(articlePage(articles,'',-2).current,1);
});

test('tag links search metadata even when the title does not repeat the tag',()=>{
 const a=[{title:'报告解读',description:'招聘变化',category:'最新资讯',tags:['人才发展']}];
 assert.equal(articlePage(a,'人才发展').total,1);
 assert.equal(articlePage(a,'无关标签').total,0);
});
