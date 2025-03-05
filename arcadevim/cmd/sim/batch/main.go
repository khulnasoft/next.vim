package main

import (
	"context"
	"os"
	"path"
	"time"

	"github.com/khulnasoft/next.vim/arcadevim/e2e-tests/sim"
	"github.com/khulnasoft/next.vim/arcadevim/pkg/assert"
	gameserverstats "github.com/khulnasoft/next.vim/arcadevim/pkg/game-server-stats"
	servermanagement "github.com/khulnasoft/next.vim/arcadevim/pkg/server-management"
)

func main() {
    logger := sim.CreateLogger("batch")
    logger.Info("Welcome to costco", "count", 15)

    ctx, cancel := context.WithCancel(context.Background())
    sim.KillContext(cancel)

    cwd, err := os.Getwd()
    assert.NoError(err, "unable to get cwd")
    p := path.Join(cwd, "e2e-tests/data/no_server")

    state := sim.CreateEnvironment(ctx, p, servermanagement.ServerParams{
        MaxLoad: 0.9,
    })

    logger.Info("Creating batched connections", "count", 15)
    clients := state.Factory.CreateBatchedConnections(15)
    logger.Info("Finished creating batched connections")
    defer cancel()

    sim.AssertClients(&state, clients);
    sim.AssertAllClientsSameServer(&state, clients);
    sim.AssertConnectionCount(&state, gameserverstats.GameServecConfigConnectionStats{
        Connections: 15,
        ConnectionsAdded: 15,
        ConnectionsRemoved: 0,
    }, time.Second * 5)
}
