import { A } from "solid-start";
import Counter from "../components/Counter";

export default function Editor() {
  document.addEventListener("DOMContentLoaded", () => {
    notebookName = "test_notebook.jl";
    document.querySelector("#printernametitle").innerText = "/" + notebookName;

    function startDisconnectedBanner() {
      document.querySelector("header").classList.add("disconnected");
      setTimeout(() => {
        ping(() => {
          document.querySelector("header").classList.remove("disconnected");
        }, startDisconnectedBanner);
      }, 1000);
    }

    window.localCells = {};
    window.codeMirrors = {};

    function createCodeMirrorInsideCell(cellNode, code) {
      var editor = CodeMirror(
        (elt) => {
          cellNode.querySelector("cellinput").appendChild(elt);
        },
        {
          value: code,
          lineNumbers: true,
          mode: "julia",
          lineWrapping: true,
          lineNumberFormatter: function (i) {
            return "⋅";
          },
          // theme: "paraiso-light",
          viewportMargin: Infinity,
          placeholder: "Enter cell code...",
        }
      );

      window.codeMirrors[cellNode.id] = editor;
      //editor.setOption("readOnly", true);

      editor.setOption("extraKeys", {
        "Ctrl-Enter": () => requestChangeRemoteCell(cellNode.id),
      });

      return editor;
    }

    function updateLocalCellOutput(cellNode, mime, output, errormessage) {
      console.log(mime);
      cellNode.classList.remove("running");

      if (errormessage) {
        cellNode.querySelector("celloutput").innerHTML =
          "<pre><code></code></pre>";
        cellNode.querySelector("celloutput").querySelector("code").innerText =
          errormessage;
        cellNode.classList.add("error");
      } else {
        cellNode.classList.remove("error");
        if (mime == "text/html") {
          // from https://stackoverflow.com/a/26716182

          cellNode.querySelector("celloutput").innerHTML = output;

          // to execute all scripts in the output html:
          try {
            var scripts = Array.prototype.slice.call(
              cellNode
                .querySelector("celloutput")
                .getElementsByTagName("script")
            );
            for (var i = 0; i < scripts.length; i++) {
              if (scripts[i].src != "") {
                if (
                  !Array.prototype.map
                    .call(
                      document.head.querySelectorAll("script"),
                      (s) => s.src
                    )
                    .includes(scripts[i])
                ) {
                  var tag = document.createElement("script");
                  tag.src = scripts[i].src;
                  document.head.appendChild(tag);
                }
              } else {
                eval(scripts[i].innerHTML);
              }
            }
          } catch (err) {
            console.log("Couldn't execute all scripts:");
            console.log(err);
            // TODO: relay to user
            // might be wise to wait after adding scripts to head
            //
          }
        } else {
          cellNode.querySelector("celloutput").innerHTML =
            "<pre><code></code></pre>";
          cellNode.querySelector("celloutput").querySelector("code").innerText =
            output;
        }
      }
    }

    cellTemplate =
      document.querySelector("#celltemplate").content.firstElementChild;
    notebookNode = document.querySelector("notebook");
    window.notebookNode = notebookNode;

    function indexOfLocalCell(cellNode) {
      // .indexOf doesn't work on HTMLCollection
      for (var i = 0; i < notebookNode.children.length; i++) {
        if (notebookNode.children[i].id == cellNode.id) {
          return i;
        }
      }
    }

    function createLocalCell(newIndex, uuid, code) {
      var newCellNode = cellTemplate.cloneNode(true);
      newCellNode.id = uuid;

      window.localCells[uuid] = newCellNode;

      moveLocalCell(newCellNode, newIndex);

      // EVENT LISTENERS FOR CLICKY THINGS

      // newCellNode.querySelector("clickshoulder").onclick = (e) => {
      //     newCellNode.classList.toggle("code-folded")
      //     // You may not fold code if the output is empty (it would be confusing)
      //     if (!newCellNode.querySelector("celloutput").innerHTML || newCellNode.querySelector("celloutput").innerText == "") {
      //         newCellNode.classList.remove("code-folded")
      //     }
      // }

      newCellNode.querySelector("celloutput").onclick = (e) => {
        // Do not fold if the click event was fired because the user selects text in the output.
        if (window.getSelection().isCollapsed) {
          // Do not fold if a link was clicked.
          if (e.target.tagName != "A") {
            newCellNode.classList.toggle("code-folded");
          }
        }
        // You may not fold code if the output is empty (it would be confusing)
        if (
          !newCellNode.querySelector("celloutput").innerHTML ||
          newCellNode.querySelector("celloutput").innerText == ""
        ) {
          newCellNode.classList.remove("code-folded");
        }
      };

      newCellNode.querySelector(".addcell.before").onclick = (e) => {
        requestNewRemoteCell(indexOfLocalCell(newCellNode));
      };
      newCellNode.querySelector(".addcell.after").onclick = (e) => {
        requestNewRemoteCell(indexOfLocalCell(newCellNode) + 1);
      };
      newCellNode.querySelector(".deletecell").onclick = (e) => {
        requestDeleteRemoteCell(newCellNode.id);
      };
      newCellNode.querySelector(".runcell").onclick = (e) => {
        requestChangeRemoteCell(newCellNode.id);
      };

      editor = createCodeMirrorInsideCell(newCellNode, code);
      editor.focus();
      //updateLocalCellOutput(newCellNode, mime, output, errormessage)
      return newCellNode;
    }

    function deleteLocalCell(cellNode) {
      // TODO: event listeners? gc?
      uuid = cellNode.id;
      try {
        delete window.codeMirrors[uuid];
      } catch (err) {}
      try {
        delete window.localCells[uuid];
      } catch (err) {}

      cellNode.remove();
    }

    function moveLocalCell(cellNode, newIndex) {
      // If you append or insert a DOM element that is already a child, then it will move that child.
      // So we have the lucky effect that this method works for both use cases: `cellNode` is not yet attached to DOM, and `cellNode` is already in the `notebookNode`.

      if (newIndex == notebookNode.children.length) {
        notebookNode.appendChild(cellNode);
      } else if (newIndex < notebookNode.children.length) {
        notebookNode.insertBefore(cellNode, notebookNode.children[newIndex]);
      } else {
        console.error(
          "Tried to insert cell at illegal position! Notebook order might be messed up!"
        );
        notebookNode.appendChild(cellNode);
      }
    }

    function deleteAllLocalCells() {
      for (var uuid in window.localCells) {
        deleteLocalCell(window.localCells[uuid]);
      }
    }

    // This is kind of overkill
    function ping(onSucces, onFailure) {
      fetch("/ping", {
        method: "GET",
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        //body: "hiiiii"
      })
        .then((response) => {
          return response.json();
        })
        .then((response) => {
          if (response == "OK!") {
            onSucces(response);
          } else {
            onFailure(response);
          }
        })
        .catch(onFailure);
    }

    function reloadAllCells(onFailure, onSucces) {
      ping(() => {
        // We have a connection!

        fetch("/getallcells", {
          method: "GET",
          cache: "no-cache",
          headers: {
            "Content-Type": "application/json",
          },
          redirect: "follow",
          referrerPolicy: "no-referrer",
          //body: "hiiiii"
        })
          .then((response) => {
            return response.json();
          })
          .then((remoteCells) => {
            console.log("Remote cells loaded");
            console.log(remoteCells);

            for (var cellIndex in remoteCells) {
              remoteCell = remoteCells[cellIndex];
              cellElement = createLocalCell(
                cellIndex,
                remoteCell.uuid,
                remoteCell.code
              );
              // if ((remoteCell.mime && remoteCell.output) || remoteCell.errormessage) {
              // 	updateLocalCellOutput(cellElement, remoteCell.mime, remoteCell.output, remoteCell.errormessage)
              // }
            }

            onSucces();
          })
          .catch(onFailure);
      }, console.warn);
    }

    function requestChangeRemoteCell(uuid) {
      window.localCells[uuid].classList.add("running");
      var onFailure = (response) => {
        console.warn("Failed to update cell!");
        console.log(response);

        startDisconnectedBanner();
      };
      newCode = window.codeMirrors[uuid].getValue();
      fetch("/changecell", {
        method: "PUT",
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({
          uuid: uuid,
          code: newCode,
        }),
      })
        .then((response) => {
          if (response.status == 200) {
            console.log("Cell updated.");
            // TODO:
            //cellsthatwillbeupdate.foreach.classList.add("running")
          } else {
            onFailure(response);
          }
        })
        .catch(onFailure);
    }

    // Indexing works as if a new cell is added.
    // e.g. if the third cell (at js-index 2) of [0, 1, 2, 3, 4]
    // is moved to the end, that would be new js-index = 5
    function requestMoveRemoteCell(uuid, newIndex) {
      var onFailure = (response) => {
        console.warn("Failed to move cell!");
        console.log(response);

        startDisconnectedBanner();
      };
      fetch("/movecell", {
        method: "PUT",
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({
          uuid: uuid,
          index: newIndex,
        }),
      })
        .then((response) => {
          if (response.status == 200) {
            console.log("Cell moved.");
          } else {
            onFailure(response);
          }
        })
        .catch(onFailure);
    }

    function runUpdateLoop() {
      console.log("run update loop");
      var onFailure = (response) => {
        console.warn("Failed to get updates!");
        console.log(response);

        document.querySelector("header").classList.add("disconnected");

        setTimeout(() => {
          ping(() => {
            document.querySelector("header").classList.remove("disconnected");
            runUpdateLoop();
          }, onFailure);
        }, 1000);
      };

      fetch("/nextcellupdate", {
        method: "GET",
        cache: "no-cache",
        redirect: "follow",
        referrerPolicy: "no-referrer",
      })
        .then((response) => {
          console.log("update response received");
          console.log(response);
          if (response.status == 200) {
            response.json().then((update) => {
              // UPDATE RECEIVED
              console.log("output deserialized");
              console.log(update);

              var message = update.message;

              switch (update.type) {
                case "update_output":
                  updateLocalCellOutput(
                    window.localCells[message.uuid],
                    message.mime,
                    message.output,
                    message.errormessage
                  );
                  break;
                case "cell_added":
                  createLocalCell(message.index, message.uuid, "");
                  break;
                case "cell_deleted":
                  // TODO: catch exception
                  var toDelete = window.localCells[message.uuid];
                  deleteLocalCell(toDelete);
                  break;
                case "cell_moved":
                  // TODO: catch exception
                  moveLocalCell(window.localCells[message.uuid], message.index);
                  break;
                default:
                  console.error("Received unknown update type!");
                  alert("Something went wrong 🙈\n Try refreshing the page");
                  break;
              }
              //TODO: animation ✨

              runUpdateLoop();
            });
          } else if (response.status == 204) {
            runUpdateLoop();
          } else {
            onFailure(response);
          }
        })
        .catch(onFailure);
    }

    function requestNewRemoteCell(newIndex) {
      var onFailure = (response) => {
        console.warn("Failed to request remote cell!");
        console.log(response);

        startDisconnectedBanner();
      };
      fetch("/addcell", {
        method: "POST",
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({
          index: newIndex,
        }),
      })
        .then((response) => {
          if (response.status == 200) {
            console.log("Cell added.");
          } else {
            onFailure(response);
          }
        })
        .catch(onFailure);
    }

    function requestDeleteRemoteCell(uuid) {
      var onFailure = (response) => {
        console.warn("Failed to delete remote cell!");
        console.log(response);

        startDisconnectedBanner();
      };
      fetch("/deletecell", {
        method: "DELETE",
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({
          uuid: uuid,
        }),
      })
        .then((response) => {
          if (response.status == 200) {
            console.log("Cell deleted.");
          } else {
            onFailure(response);
          }
        })
        .catch(onFailure);
    }
    ping(console.log, console.warn);
    reloadAllCells(console.warn, runUpdateLoop);

    if ("fonts" in document) {
      document.fonts.ready.then(function () {
        console.log("fonts loaded");
        for (var uuid in window.codeMirrors) {
          window.codeMirrors[uuid].refresh();
        }
      });
    }

    // TODO: reconnect with a delay if the last request went poorly
    // this would avoid hanging UI when the connection is lost maybe?
    // implemented, but untested

    // TODO: check cell order every now and then?
    // or do ___maths___ to make sure that it never gets messed up

    function argmin(x) {
      var best_val = Infinity;
      var best_index = -1;
      var val;
      for (var i = 0; i < x.length; i++) {
        val = x[i];
        if (val < best_val) {
          best_index = i;
          best_val = val;
        }
      }
      return best_index;
    }

    dropruler = document.querySelector("dropruler");

    document.ondragover = (e) => {
      e.preventDefault();
    };

    var dropPositions = [];
    var dropee = null;
    document.ondragstart = (e) => {
      dropee = e.target.parentElement;

      dropPositions = [];
      for (var i = 0; i < notebookNode.children.length; i++) {
        dropPositions.push(notebookNode.children[i].offsetTop);
      }
      dropPositions.push(
        notebookNode.lastChild.offsetTop + notebookNode.lastChild.scrollHeight
      );
    };
    // Called continuously during drag
    document.ondrag = (e) => {
      dist = dropPositions.map((p) => Math.abs(p - e.pageY));
      dropIndex = argmin(dist);

      dropruler.style.top = dropPositions[dropIndex] + "px";
      dropruler.style.display = "block";
      console.log(dropIndex);
    };
    document.ondrop = (e) => {
      dist = dropPositions.map((p) => Math.abs(p - e.pageY));
      dropIndex = argmin(dist);

      dropruler.style.display = "none";

      requestMoveRemoteCell(dropee.id, dropIndex);
    };

    window.reloadAllCells = reloadAllCells;
    window.ping = ping;

    //editor.on("change", window.preview);
    window.fakeCells = () => {
      var last;
      last = createLocalCell(0, "0", "100*x + y");
      updateLocalCellOutput(last, "text/plain", "100*x + y", "");
      last = createLocalCell(1, "0", "x = 1 + 1");
      updateLocalCellOutput(last, "text/plain", "x = 1 + 1", "");
      last = createLocalCell(2, "0", "y = x * 2");
      updateLocalCellOutput(last, "text/plain", "y = x * 2", "");
      last = createLocalCell(
        3,
        "0",
        'html"<h1>Hoi!</h1>\n<p>My name is <em>kiki</em></p>"'
      );
      updateLocalCellOutput(
        last,
        "text/html",
        "<h1>Hoi!</h1>\n<p>My name is <em>kiki</em></p>",
        ""
      );
      last = createLocalCell(
        4,
        "0",
        'using Markdown; md"# Cześć!\nMy name is **baba** and I like $maths$\n\n_(Markdown -> HTML is for free, for LaTeX we need to pre-/post-process the HTML, and import a latex-js lib)_"'
      );
      updateLocalCellOutput(
        last,
        "text/html",
        'using Markdown; md"# Cześć!\nMy name is **baba** and I like $maths$\n\n_(Markdown -> HTML is for free, for LaTeX we need to pre-/post-process the HTML, and import a latex-js lib)_"',
        ""
      );
    };

    if (document.location.protocol == "file:") {
      window.fakeCells();
    }
  });
  return (
    <>
      <main class="text-center mx-auto text-gray-700 p-4">
        <notebook></notebook>
        <dropruler></dropruler>
        <template id="celltemplate">
          <cell>
            <clickshoulder draggable="true"></clickshoulder>
            <trafficlight></trafficlight>
            <button class="addcell before">
              <span></span>
            </button>
            <celloutput tabindex="1"></celloutput>
            <cellinput>
              <button class="deletecell">
                <span></span>
              </button>
              <button class="runcell">
                <span></span>
              </button>
            </cellinput>
            <button class="addcell after">
              <span></span>
            </button>
          </cell>
        </template>
      </main>

      <footer>
        <div id="info">
          <a href="https://github.com/fonsp/Pluto.jl">Pluto.jl</a>, by{" "}
          <a href="https://github.com/fonsp" rel="author">
            fonsp
          </a>{" "}
          and{" "}
          <a href="https://github.com/malyvsen" rel="author">
            malyvsen
          </a>
        </div>
      </footer>
    </>
  );
}
