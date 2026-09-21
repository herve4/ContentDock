// Empêche la console terminal supplémentaire sous Windows en mode release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    contentdock_lib::run()
}
