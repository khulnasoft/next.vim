local next = require("next")
local popup = require("plenary.popup")
local utils = require("next.utils")
local log = require("next.dev").log
local term = require("next.term")

local M = {}

Next_cmd_win_id = nil
Next_cmd_bufh = nil

local function close_menu(force_save)
    force_save = force_save or false
    local global_config = next.get_global_settings()

    if global_config.save_on_toggle or force_save then
        require("next.cmd-ui").on_menu_save()
    end

    vim.api.nvim_win_close(Next_cmd_win_id, true)

    Next_cmd_win_id = nil
    Next_cmd_bufh = nil
end

local function create_window()
    log.trace("_create_window()")
    local config = next.get_menu_config()
    local width = config.width or 60
    local height = config.height or 10
    local borderchars = config.borderchars
        or { "─", "│", "─", "│", "╭", "╮", "╯", "╰" }
    local bufnr = vim.api.nvim_create_buf(false, false)

    local Next_cmd_win_id, win = popup.create(bufnr, {
        title = "Next Commands",
        highlight = "NextWindow",
        line = math.floor(((vim.o.lines - height) / 2) - 1),
        col = math.floor((vim.o.columns - width) / 2),
        minwidth = width,
        minheight = height,
        borderchars = borderchars,
    })

    vim.api.nvim_win_set_option(win.border.win_id, "winhl", "Normal:NextBorder")

    return {
        bufnr = bufnr,
        win_id = Next_cmd_win_id,
    }
end

local function get_menu_items()
    log.trace("_get_menu_items()")
    local lines = vim.api.nvim_buf_get_lines(Next_cmd_bufh, 0, -1, true)
    local indices = {}

    for _, line in pairs(lines) do
        if not utils.is_white_space(line) then
            table.insert(indices, line)
        end
    end

    return indices
end

function M.toggle_quick_menu()
    log.trace("cmd-ui#toggle_quick_menu()")
    if
        Next_cmd_win_id ~= nil
        and vim.api.nvim_win_is_valid(Next_cmd_win_id)
    then
        close_menu()
        return
    end

    local win_info = create_window()
    local contents = {}
    local global_config = next.get_global_settings()

    Next_cmd_win_id = win_info.win_id
    Next_cmd_bufh = win_info.bufnr

    for idx, cmd in pairs(next.get_term_config().cmds) do
        contents[idx] = cmd
    end

    vim.api.nvim_win_set_option(Next_cmd_win_id, "number", true)
    vim.api.nvim_buf_set_name(Next_cmd_bufh, "next-cmd-menu")
    vim.api.nvim_buf_set_lines(Next_cmd_bufh, 0, #contents, false, contents)
    vim.api.nvim_buf_set_option(Next_cmd_bufh, "filetype", "next")
    vim.api.nvim_buf_set_option(Next_cmd_bufh, "buftype", "acwrite")
    vim.api.nvim_buf_set_option(Next_cmd_bufh, "bufhidden", "delete")
    vim.api.nvim_buf_set_keymap(
        Next_cmd_bufh,
        "n",
        "q",
        "<Cmd>lua require('next.cmd-ui').toggle_quick_menu()<CR>",
        { silent = true }
    )
    vim.api.nvim_buf_set_keymap(
        Next_cmd_bufh,
        "n",
        "<ESC>",
        "<Cmd>lua require('next.cmd-ui').toggle_quick_menu()<CR>",
        { silent = true }
    )
    vim.api.nvim_buf_set_keymap(
        Next_cmd_bufh,
        "n",
        "<CR>",
        "<Cmd>lua require('next.cmd-ui').select_menu_item()<CR>",
        {}
    )
    vim.cmd(
        string.format(
            "autocmd BufWriteCmd <buffer=%s> lua require('next.cmd-ui').on_menu_save()",
            Next_cmd_bufh
        )
    )
    if global_config.save_on_change then
        vim.cmd(
            string.format(
                "autocmd TextChanged,TextChangedI <buffer=%s> lua require('next.cmd-ui').on_menu_save()",
                Next_cmd_bufh
            )
        )
    end
    vim.cmd(
        string.format(
            "autocmd BufModifiedSet <buffer=%s> set nomodified",
            Next_cmd_bufh
        )
    )
end

function M.select_menu_item()
    log.trace("cmd-ui#select_menu_item()")
    local cmd = vim.fn.line(".")
    close_menu(true)
    local answer = vim.fn.input("Terminal index (default to 1): ")
    if answer == "" then
        answer = "1"
    end
    local idx = tonumber(answer)
    if idx then
        term.sendCommand(idx, cmd)
    end
end

function M.on_menu_save()
    log.trace("cmd-ui#on_menu_save()")
    term.set_cmd_list(get_menu_items())
end

return M
