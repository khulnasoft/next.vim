local eq = assert.are.same
local utils = require("vim-insight.tests.utils")
local float = require("vim-insight.ui.float")

describe("grapple", function()
    before_each(function()
        utils.clear_memory()
        float = require("vim-insight.ui.float")
    end)

    it("ensure toggle works with float", function()
        eq(float.buf_id, nil)
        eq(float.win_id, nil)

        float:toggle()

        local win_id = float.win_id
        local buf_id = float.buf_id
        eq(true, vim.api.nvim_win_is_valid(win_id))
        eq(true, vim.api.nvim_buf_is_valid(buf_id))

        float:toggle()

        eq(float.buf_id, nil)
        eq(float.win_id, nil)
        eq(false, vim.api.nvim_win_is_valid(win_id))
        eq(false, vim.api.nvim_buf_is_valid(buf_id))
    end)

    it("ensure toggle works with float", function()
        eq(float.buf_id, nil)
        eq(float.win_id, nil)

        float:toggle()

        local win_id = float.win_id
        local buf_id = float.buf_id
        eq(true, vim.api.nvim_win_is_valid(win_id))
        eq(true, vim.api.nvim_buf_is_valid(buf_id))

        vim.api.nvim_buf_delete(buf_id, { force = true })

        eq(nil, float.buf_id)
        eq(nil, float.win_id)
        eq(false, vim.api.nvim_win_is_valid(win_id))
        eq(false, vim.api.nvim_buf_is_valid(buf_id))
    end)
end)
