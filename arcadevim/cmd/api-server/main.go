package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/joho/godotenv"
	"github.com/khulnasoft/next.vim/arcadevim/pkg/api"
	"github.com/khulnasoft/next.vim/arcadevim/pkg/assert"
	"github.com/khulnasoft/next.vim/arcadevim/pkg/ctrlc"
	gameserverstats "github.com/khulnasoft/next.vim/arcadevim/pkg/game-server-stats"
	prettylog "github.com/khulnasoft/next.vim/arcadevim/pkg/pretty-log"
)

func getId() string {
    return os.Getenv("ID")
}

func main() {
    godotenv.Load()

    if os.Getenv("DEBUG_LOG") != "" {
        assert.Never("debug log should never be specified for a dummy server")
    }

    sqlitePath := os.Getenv("SQLITE")
    assert.Assert(sqlitePath != "", "you must provide a sqlite env variable to run the simulation dummy server")
    sqlitePath = gameserverstats.EnsureSqliteURI(sqlitePath)

    prettylog.CreateLoggerFromEnv(os.Stderr)
    slog.SetDefault(slog.Default().With("process", fmt.Sprintf("DummyServer-%s", getId())))

    ll :=  slog.Default().With("area", "dummy-server")
    ll.Warn("dummy-server initializing...")

    db := gameserverstats.NewSqlite(sqlitePath)
    db.SetSqliteModes()
    host, port := api.GetHostAndPort()

    config := gameserverstats.GameServerConfig {
        State: gameserverstats.GSStateReady,
        Connections: 0,
        Load: 0,
        Id: getId(),
        Host: host,
        Port: port,
    }

    ll.Info("creating server", "port", port, "host", host)
    server := api.NewGameServerRunner(db, config)
    ctx, cancel := context.WithCancel(context.Background())
    ctrlc.HandleCtrlC(cancel)

    defer server.Close()
    go db.Run(ctx)
    go func () {
        ll.Info("running server", "port", port, "host", host)
        err := server.Run(ctx)
        if err != nil {
            ll.Error("Game Server Run came returned with an error", "error", err)
            cancel()
        }
    }()

    server.Wait()
    cancel()
    ll.Error("dummy game server finished")
}
