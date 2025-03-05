local action_state = require("telescope.actions.state")
local action_utils = require("telescope.actions.utils")
local entry_display = require("telescope.pickers.entry_display")
local finders = require("telescope.finders")
local pickers = require("telescope.pickers")
local conf = require("telescope.config").values
local next = require("next")
local next_mark = require("next.mark")

local function prepare_results(list)
    local next_mark_list = {} -- Renamed from `next` to avoid shadowing
    for idx = 1, #list do
        if list[idx].filename ~= "" then
            list[idx].index = idx
            table.insert(next_mark_list, list[idx])
        end
    end

    return next_mark_list
end

local generate_new_finder = function()
    return finders.new_table({
        results = prepare_results(next.get_mark_config().marks),
        entry_maker = function(entry)
            local line = entry.filename .. ":" .. entry.row .. ":" .. entry.col
            local displayer = entry_display.create({
                separator = " - ",
                items = {
                    { width = 2 },
                    { width = 50 },
                    { remaining = true },
                },
            })
            local make_display = function()
                return displayer({
                    tostring(entry.index),
                    line,
                })
            end
            return {
                value = entry,
                ordinal = line,
                display = make_display,
                lnum = entry.row,
                col = entry.col,
                filename = entry.filename,
            }
        end,
    })
end

local delete_next_mark = function(prompt_bufnr)
    local confirmation =
        vim.fn.input(string.format("Delete current mark(s)? [y/n]: "))
    if
        string.len(confirmation) == 0
        or string.sub(string.lower(confirmation), 0, 1) ~= "y"
    then
        print(string.format("Didn't delete mark"))
        return
    end

    local selection = action_state.get_selected_entry()
    next_mark.rm_file(selection.filename)

    local function get_selections()
        local results = {}
        action_utils.map_selections(prompt_bufnr, function(entry)
            table.insert(results, entry)
        end)
        return results
    end

    local selections = get_selections()
    for _, current_selection in ipairs(selections) do
        next_mark.rm_file(current_selection.filename)
    end

    local current_picker = action_state.get_current_picker(prompt_bufnr)
    current_picker:refresh(generate_new_finder(), { reset_prompt = true })
end

local move_mark_up = function(prompt_bufnr)
    local selection = action_state.get_selected_entry()
    local length = next_mark.get_length()

    if selection.index == length then
        return
    end

    local mark_list = next.get_mark_config().marks

    table.remove(mark_list, selection.index)
    table.insert(mark_list, selection.index + 1, selection.value)

    local current_picker = action_state.get_current_picker(prompt_bufnr)
    current_picker:refresh(generate_new_finder(), { reset_prompt = true })
end

local move_mark_down = function(prompt_bufnr)
    local selection = action_state.get_selected_entry()
    if selection.index == 1 then
        return
    end
    local mark_list = next.get_mark_config().marks
    table.remove(mark_list, selection.index)
    table.insert(mark_list, selection.index - 1, selection.value)
    local current_picker = action_state.get_current_picker(prompt_bufnr)
    current_picker:refresh(generate_new_finder(), { reset_prompt = true })
end

return function(opts)
    opts = opts or {}

    pickers
        .new(opts, {
            prompt_title = "next marks",
            finder = generate_new_finder(),
            sorter = conf.generic_sorter(opts),
            previewer = conf.grep_previewer(opts),
            attach_mappings = function(_, map)
                map("i", "<c-d>", delete_next_mark)
                map("n", "<c-d>", delete_next_mark)

                map("i", "<c-p>", move_mark_up)
                map("n", "<c-p>", move_mark_up)

                map("i", "<c-n>", move_mark_down)
                map("n", "<c-n>", move_mark_down)
                return true
            end,
        })
        :find()
end
