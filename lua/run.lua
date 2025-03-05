local function R(module)
    package.loaded[module] = nil
    return require(module)
end

local NextAPMRequired = _G.NextAPMRequired
if NextAPMRequired then
    require("next-apm"):clear()
end
R("next-apm")

local apm = require("next-apm")
apm:setup({
    reporter = {
        type = "network",
    },
})

--[[
vim.on_key(function(key)
    print("key: " .. key)
end)


vim.api.nvim_feedkeys("23jci{hello worldkdi(itrue", "t", false)

--[[
hello world

he ntoheuoeuaoeunato euoeuaoeuoaeu
aoeuaoeutaoeuaoeuaoeunth
aoeuoaeuoaeuth
aoeuoaeuoaeuaoeuoaeuaoeu

oaentuh
aonetuh
naoteu
ntoaeh
ntaoehntaoeu

aoenuthaonetuhaonteuhnt
ntoehu
ntoaheu
ntaoheuntoah
untaoh
euoaeuoaeu

ntaoheuntoheu } onateuhnotehu

if (true) {
    ntoheuntoheutn
}
--]]
