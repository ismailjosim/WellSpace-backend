const fs = require('fs')
const path = require('path')

const moduleName = process.argv[2]

if (!moduleName) {
	console.error('❌ Usage: node createModule.cjs <module-name>')
	process.exit(1)
}

const baseDir = path.join(__dirname, 'src', 'app', 'modules')
const moduleDir = path.join(baseDir, moduleName)

// Only these 4 files
const filesToCreate = [
	`${moduleName}.route.ts`,
	`${moduleName}.controller.ts`,
	`${moduleName}.service.ts`,
	`${moduleName}.validation.ts`,
]

const getFileContent = (fileName) => {
	const modulePrefix = fileName.split('.')[0]
	const capitalizedModulePrefix =
		modulePrefix.charAt(0).toUpperCase() + modulePrefix.slice(1)
	const type = fileName.split('.')[1]

	switch (type) {
		case 'controller':
			return `import { Request, Response } from 'express';
import catchAsync from '@/shared/catchAsync';
import sendResponse from '@/shared/sendResponse';
import StatusCode from '@/utils/statusCode';
import { ${capitalizedModulePrefix}Service } from './${modulePrefix}.service';

const create${capitalizedModulePrefix} = catchAsync(async (req: Request, res: Response) => {
	const result = await ${capitalizedModulePrefix}Service.create${capitalizedModulePrefix}IntoDB(req.user, req.body);

	sendResponse(res, {
		statusCode: StatusCode.CREATED,
		success: true,
		message: '${capitalizedModulePrefix} created successfully!',
		data: result,
	});
});

export const ${capitalizedModulePrefix}Controller = {
	create${capitalizedModulePrefix},
};`

		case 'service':
			return `import { prisma } from '@/config/prisma.config';
import type { JwtPayload } from 'jsonwebtoken';

const create${capitalizedModulePrefix}IntoDB = async (user: JwtPayload, payload: any) => {
	// Implement DB logic here
	console.log('Creating ${modulePrefix} with payload:', payload);
	return null;
};

export const ${capitalizedModulePrefix}Service = {
	create${capitalizedModulePrefix}IntoDB,
};`

		case 'validation':
			return `import { z } from 'zod';

const create${capitalizedModulePrefix}ValidationSchema = z.object({
	body: z.object({
		// Define validation schema here
	}),
});

export const ${capitalizedModulePrefix}Validation = {
	create${capitalizedModulePrefix}ValidationSchema,
};`

		case 'route':
			return `import { Router } from 'express';
import { ${capitalizedModulePrefix}Controller } from './${modulePrefix}.controller';
import validateRequest from '@/middlewares/validateRequest';
// import checkAuth from '@/middlewares/checkAuth';
// import { UserRole } from '@prisma/client';

const router = Router();

router.post(
	'/',
	validateRequest(${capitalizedModulePrefix}Validation.create${capitalizedModulePrefix}ValidationSchema),
	// checkAuth(UserRole.DOCTOR), // Uncomment if needed
	${capitalizedModulePrefix}Controller.create${capitalizedModulePrefix}
);

export const ${capitalizedModulePrefix}Routes = router;`

		default:
			return `// ${fileName} for ${moduleName} module`
	}
}

// Create module directory
try {
	fs.mkdirSync(moduleDir, { recursive: true })
	console.log(`📁 Directory created: ${moduleDir}`)
} catch (err) {
	console.error(`❌ Error creating directory ${moduleDir}:`, err)
	process.exit(1)
}

// Create files
filesToCreate.forEach((fileName) => {
	const filePath = path.join(moduleDir, fileName)
	const fileContent = getFileContent(fileName)

	try {
		fs.writeFileSync(filePath, fileContent.trim() + '\n')
		console.log(`✅ File created: ${filePath}`)
	} catch (err) {
		console.error(`❌ Error creating file ${filePath}:`, err)
	}
})

console.log(`\n✨ Module '${moduleName}' setup complete!`)
console.log(
	`👉 Don't forget to integrate '${moduleName}.route.ts' into your main Express app.`,
)
