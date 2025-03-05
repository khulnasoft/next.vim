package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/khulnasoft/next.vim/vim-mate/pkg/commands"
	"github.com/khulnasoft/next.vim/vim-mate/pkg/particles"
	"github.com/khulnasoft/next.vim/vim-mate/pkg/tcp"
	"github.com/khulnasoft/next.vim/vim-mate/pkg/testies"
	"github.com/khulnasoft/next.vim/vim-mate/pkg/window"
)

func main() {
	testies.SetupLogger()
	server, err := testies.CreateServerFromArgs()
	if err != nil {
		slog.Error("Error creating server: %s", err)
	}

	h := 36
	w := 121
	commander := commands.NewCommander()
	renderer := window.NewRender(h, w)

	server.WelcomeMessage(tcp.MakeWelcome(commander.ToCommands()))
	server.WelcomeMessage(tcp.MakeWelcome(commands.OpenCommand(renderer)))

	defer server.Close()
	go server.Start()

	coffee := particles.NewCoffee(w, h, 19.0)
	coffee.Start()
	renderer.Add(&coffee)

	// Server for pprof
	go func() {
		fmt.Println(http.ListenAndServe("localhost:6060", nil))
	}()

	timer := time.NewTicker(20 * time.Millisecond)
	for range timer.C {
		coffee.Update()
		partials := renderer.Render()
		server.Send(commands.PartialRender(partials))
	}
}
