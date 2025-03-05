-- luacheck: push ignore
VimAPMRequired = true
-- luacheck: pop

local APM = require("next-apm.apm")
local float = require("next-apm.ui.float")
local Reporter = require("next-apm.reporter")
local Actions = require("next-apm.actions")
local APMBussin = require("next-apm.bus")
local Interval = require("next-apm.interval")

---@class APMOptions
---@field reporter? APMReporterOptions

---@class Event
---@field buf number
---@field match string

---@class VimApm
---@field apm APM | nil
---@field monitor APMFloat | nil
---@field actions APMActions
---@field reporter APMReporter | nil
local VimApm = {}

VimApm.__index = VimApm

---@return VimApm
function VimApm.new()
    local self = setmetatable({
        enabled = false,
        actions = Actions.new(),
        monitor = float.new(),
        apm = APM.new(),
    }, VimApm)

    return self
end

---@param opts APMOptions
function VimApm:setup(opts)
    opts = vim.tbl_extend("force", {}, {
        reporter = Reporter.default_options(),
    }, opts)

    self:clear()
    self.enabled = true
    Interval.enable()

    self.reporter = Reporter.create_reporter(opts.reporter)
    self.reporter:enable()

    self.actions:enable()
    self.monitor:enable()
    self.apm:enable()
end

function VimApm:clear()
    APMBussin:clear()
    Interval.clear()
    self.actions:clear()
    self.enabled = false

    if self.reporter ~= nil then
        self.reporter:clear()
        self.reporter = nil
    end
end

function VimApm:toggle_monitor()
    self.monitor:toggle()
end

return VimApm.new()
