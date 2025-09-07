function i(t=""){const r="/myListening/";return t?/^https?:\/\//i.test(t)||t.startsWith(r)?t:t.startsWith("/")?r+t.slice(1):r+t:r}export{i as withBase};
