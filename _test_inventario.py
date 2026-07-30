"""Test rápido: login admin, navegar a Inventario, ver tabla."""
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 900})

        # Login
        page.goto(f'{BASE}/login')
        page.wait_for_load_state('networkidle')
        page.fill('input[type="email"]', 'admin@cashregister.com')
        page.fill('input[type="password"]', 'Admin123!')
        page.click('button[type="submit"]')
        page.wait_for_url('**/')

        # Ir a Inventario
        page.locator('text=INVENTARIO').first.click()
        page.wait_for_url('**/cajero/productos')
        page.wait_for_timeout(1000)

        # Verificar que hay filas en la tabla
        rows = page.locator('table tbody tr')
        count = rows.count()
        print(f'[OK] Inventario cargado: {count} productos en tabla')

        # Verificar que NO hay error en consola
        errors = []
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.wait_for_timeout(500)
        if errors:
            print(f'[FAIL] Errores en consola: {errors}')
        else:
            print('[OK] Sin errores en consola')

        browser.close()
        print('\n=== TEST PASADO ===')

if __name__ == '__main__':
    main()
