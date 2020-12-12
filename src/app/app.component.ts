import {
  Component,
  OnInit,
  ViewChild,
  AfterViewChecked,
  ChangeDetectorRef
} from "@angular/core";
import { HttpClient } from "@angular/common/http";

import "core-js";
@Component({
  selector: "my-app",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"]
})
export class AppComponent implements OnInit, AfterViewChecked {
  name = "Angular";

  formData: any;
  isFormValid = true;
  formSchema: any;
  form: any;
  schema: any;
  formActive = false;

  jsonFormOptions: any = {
    addSubmit: false, // Add a submit button if layout does not have one
    debug: false, // Don't show inline debugging information
    loadExternalAssets: true, // Load external css and JavaScript for frameworks
    returnEmptyFields: false, // Don't return values for empty input fields
    setSchemaDefaults: true, // Always use schema defaults for empty fields
    defautWidgetOptions: { feedback: true } // Show inline feedback icons
  };

  constructor(private http: HttpClient, private cdRef: ChangeDetectorRef) {}

  ngAfterViewChecked() {
    this.cdRef.detectChanges();
  }

  ngOnInit() {
    this.populateForm();
  }

  isFormValidFn(event: boolean) {
    this.isFormValid = event;
  }

  private loadInital() {
    this.schema = {
      title: "Comment",
      type: "object",
      required: ["todos", "users"],
      properties: {
        todos: {
          type: "array",
          items: {
            type: "object",
            properties: {
              task: {
                title: "Task",
                type: "string"
              }
            },
            required: ["task"]
          }
        },
        users: {
          title: "User",
          type: "string"
        }
      }
    };

    this.form = [
      {
        type: "help",
        helpvalue:
          "<h4>Array Example</h4><p>Try adding a couple of forms, reorder by drag'n'drop.</p>"
      },
      {
        key: "todos",
        add: "New",
        style: {
          add: "btn-success"
        },
        items: [
          {
            key: "todos[].task",
            type: "select",
            options: {
              source: "https://jsonplaceholder.typicode.com/todos",
              columnName: "title",
              columnValue: "id"
            }
          }
        ]
      },
      {
        key: "users",
        type: "select",
        options: {
          source: "https://jsonplaceholder.typicode.com/users",
          columnName: "name",
          columnValue: "id"
        }
      }
    ];
  }

  private activateForm() {
    this.formSchema = {
      schema: this.schema,
      form: this.form
    };
    this.formActive = true;
  }
  private populateForm() {
    this.formActive = false;

    const onInits = [];
    this.loadInital();

    if (this.form) {
      // recursively traverse the form json
      const traverse = item => {
        if (item.items) {
          item.items.map(traverse);
        } else if (item.tabs) {
          item.tabs.map(traverse);
        }

        // call onInit callbacks
        if (item.options) {
          if (item.options.source) {
            onInits.push(this.callRestService(item.key, item.options));
          }
        }
      };

      if (Array.isArray(this.form)) {
        this.form.map(traverse);

        Promise.all(onInits)
          .then(() => {
            this.form.map((item: { options: any }) => {
              // deleto options pois o Angular6-json-schema-form se perde ao montar o titleMap
              delete item.options;
            });
            // monta form:
            this.activateForm();
          })
          .catch(error => {
            // error handling and message display
          });
      } else {
        this.activateForm();
      }
    } else {
      this.activateForm();
    }
  }

  private hasSource(uiSchema: string): boolean {
    return uiSchema.includes("source");
  }
  private hasValidDynamic(options: any): boolean {
    return (
      typeof options.source !== "undefined" &&
      typeof options.columnName !== "undefined" &&
      typeof options.columnValue !== "undefined"
    );
  }
  private callRestService(key: string, options: any) {
    if (!this.hasValidDynamic(options)) return null;

    return this.http
      .get(options.source)
      .toPromise()
      .then((res: any) => {
        if (Array.isArray(res)) {
          const mapList = res.map((item: any) => {
            return {
              value: item[options.columnValue],
              name: item[options.columnName]
            };
          });

          if (key.includes("[]")) {
            const parentKey = key.split("[]")[0];
            const parent = this.form.find(
              (item: { key: string }) => item.key === parentKey
            );
            const child = parent.items.find(
              (item: { key: string }) => item.key === key
            );
            delete child.options;
            child.titleMap = mapList;
          } else {
            const itemIndex = this.form.findIndex(
              (item: { key: string }) => item.key === key
            );
            this.form[itemIndex]["titleMap"] = mapList;
          }
        }
      });
  }
}
